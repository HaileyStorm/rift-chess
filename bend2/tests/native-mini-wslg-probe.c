#define _POSIX_C_SOURCE 200809L

#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/keysym.h>

#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

typedef struct {
  Window window;
  int depth;
} WindowMatch;

static void pause_ms(long ms) {
  struct timespec ts = { ms / 1000, (ms % 1000) * 1000000L };
  nanosleep(&ts, NULL);
}

static int has_title(Display* display, Window window, const char* title) {
  char* name = NULL;
  int matched = XFetchName(display, window, &name) && name
      && strcmp(name, title) == 0;
  if (name) {
    XFree(name);
  }
  return matched;
}

static void find_title(Display* display, Window parent, const char* title,
  int depth, WindowMatch* best) {
  if (depth > 12) {
    return;
  }
  if (has_title(display, parent, title)) {
    XWindowAttributes attrs;
    if (XGetWindowAttributes(display, parent, &attrs)
        && attrs.map_state == IsViewable && depth >= best->depth) {
      best->window = parent;
      best->depth = depth;
    }
  }

  Window root = None, next_parent = None, *children = NULL;
  unsigned int count = 0;
  if (!XQueryTree(display, parent, &root, &next_parent, &children, &count)) {
    return;
  }
  for (unsigned int i = 0; i < count; i += 1) {
    find_title(display, children[i], title, depth + 1, best);
  }
  if (children) {
    XFree(children);
  }
}

static Window wait_for_window(Display* display, const char* title) {
  WindowMatch best = { None, -1 };
  Window root = DefaultRootWindow(display);
  for (int i = 0; i < 120; i += 1) {
    best.window = None;
    best.depth = -1;
    find_title(display, root, title, 0, &best);
    if (best.window != None) {
      return best.window;
    }
    pause_ms(100);
  }
  return None;
}

static unsigned int channel(unsigned long pixel, unsigned long mask) {
  if (mask == 0) {
    return 0;
  }
  int shift = 0;
  while ((mask & 1) == 0) {
    mask >>= 1;
    shift += 1;
  }
  unsigned long value = (pixel >> shift) & mask;
  return (unsigned int)((value * 255 + mask / 2) / mask);
}

static uint32_t rgb(Display* display, XImage* image, int x, int y) {
  Visual* visual = DefaultVisual(display, DefaultScreen(display));
  unsigned long pixel = XGetPixel(image, x, y);
  return (channel(pixel, visual->red_mask) << 16)
      | (channel(pixel, visual->green_mask) << 8)
      | channel(pixel, visual->blue_mask);
}

static int write_ppm(Display* display, XImage* image, const char* path) {
  FILE* file = fopen(path, "wb");
  if (!file) {
    perror(path);
    return 0;
  }
  if (fprintf(file, "P6\n%d %d\n255\n", image->width, image->height) < 0) {
    fclose(file);
    return 0;
  }
  for (int y = 0; y < image->height; y += 1) {
    for (int x = 0; x < image->width; x += 1) {
      uint32_t c = rgb(display, image, x, y);
      unsigned char bytes[3] = {
        (unsigned char)(c >> 16),
        (unsigned char)(c >> 8),
        (unsigned char)c
      };
      if (fwrite(bytes, sizeof bytes, 1, file) != 1) {
        fclose(file);
        return 0;
      }
    }
  }
  return fclose(file) == 0;
}

static XImage* capture(Display* display, Window window, const char* path) {
  XWindowAttributes attrs;
  if (!XGetWindowAttributes(display, window, &attrs)) {
    return NULL;
  }
  XSync(display, False);
  XImage* image = XGetImage(display, window, 0, 0,
    (unsigned int)attrs.width, (unsigned int)attrs.height,
    AllPlanes, ZPixmap);
  if (!image) {
    fprintf(stderr, "XGetImage failed for the native window\n");
    return NULL;
  }
  if (!write_ppm(display, image, path)) {
    XDestroyImage(image);
    return NULL;
  }
  return image;
}

static int send_button(Display* display, Window window, int type,
  int x, int y) {
  Window root = DefaultRootWindow(display), child = None;
  int root_x = 0, root_y = 0;
  XTranslateCoordinates(display, window, root, x, y,
    &root_x, &root_y, &child);
  XEvent event;
  memset(&event, 0, sizeof event);
  event.xbutton.type = type;
  event.xbutton.display = display;
  event.xbutton.window = window;
  event.xbutton.root = root;
  event.xbutton.subwindow = None;
  event.xbutton.time = CurrentTime;
  event.xbutton.x = x;
  event.xbutton.y = y;
  event.xbutton.x_root = root_x;
  event.xbutton.y_root = root_y;
  event.xbutton.state = 0;
  event.xbutton.button = Button1;
  event.xbutton.same_screen = True;
  long mask = type == ButtonPress ? ButtonPressMask : ButtonReleaseMask;
  int sent = XSendEvent(display, window, False, mask, &event);
  XFlush(display);
  return sent != 0;
}

static int click(Display* display, Window window, int x, int y) {
  if (!send_button(display, window, ButtonPress, x, y)) {
    return 0;
  }
  pause_ms(60);
  if (!send_button(display, window, ButtonRelease, x, y)) {
    return 0;
  }
  pause_ms(180);
  return 1;
}

static void send_escape(Display* display, Window window) {
  XEvent event;
  memset(&event, 0, sizeof event);
  event.xkey.type = KeyPress;
  event.xkey.display = display;
  event.xkey.window = window;
  event.xkey.root = DefaultRootWindow(display);
  event.xkey.subwindow = None;
  event.xkey.time = CurrentTime;
  event.xkey.keycode = XKeysymToKeycode(display, XK_Escape);
  event.xkey.same_screen = True;
  XSendEvent(display, window, False, KeyPressMask, &event);
  XFlush(display);
}

static int exited_successfully(pid_t child, int seconds) {
  int status = 0;
  for (int i = 0; i < seconds * 20; i += 1) {
    pid_t result = waitpid(child, &status, WNOHANG);
    if (result == child) {
      return WIFEXITED(status) && WEXITSTATUS(status) == 0;
    }
    if (result < 0) {
      perror("waitpid");
      return 0;
    }
    pause_ms(50);
  }
  fprintf(stderr, "native window did not close after Escape; timeout wrapper remains armed\n");
  return 0;
}

int main(int argc, char** argv) {
  if (argc != 2) {
    fprintf(stderr, "usage: %s /path/to/native-mini\n", argv[0]);
    return 2;
  }
  pid_t child = fork();
  if (child < 0) {
    perror("fork");
    return 2;
  }
  if (child == 0) {
    execlp("timeout", "timeout", "--signal=INT", "--kill-after=5s",
      "60s", argv[1], (char*)NULL);
    perror("exec timeout");
    _exit(127);
  }

  Display* display = XOpenDisplay(NULL);
  if (!display) {
    fprintf(stderr, "XOpenDisplay failed; verify the WSLg DISPLAY\n");
    return 2;
  }
  Window window = wait_for_window(display, "Rift Chess Experimental Native Mini");
  if (window == None) {
    fprintf(stderr, "could not find visible Rift Chess Experimental Native Mini window\n");
    XCloseDisplay(display);
    return 1;
  }
  XWindowAttributes attrs;
  if (!XGetWindowAttributes(display, window, &attrs)
      || attrs.width != 256 || attrs.height != 256) {
    fprintf(stderr, "unexpected native window size\n");
    send_escape(display, window);
    XCloseDisplay(display);
    return 1;
  }
  XRaiseWindow(display, window);
  XSetInputFocus(display, window, RevertToParent, CurrentTime);
  XSync(display, False);
  pause_ms(800);

  XImage* before = capture(display, window, "native-mini-before.ppm");
  if (!before) {
    send_escape(display, window);
    XCloseDisplay(display);
    return 1;
  }
  uint32_t before_source = rgb(display, before, 112, 208);
  uint32_t before_target = rgb(display, before, 112, 144);
  XDestroyImage(before);

  int white_input = click(display, window, 112, 208)
      && click(display, window, 112, 144);
  pause_ms(500);
  XImage* after_white = capture(display, window,
    "native-mini-after-white-d2-d4.ppm");
  int have_after_white = after_white != NULL;
  uint32_t white_source = after_white ? rgb(display, after_white, 112, 208) : 0;
  uint32_t white_target = after_white ? rgb(display, after_white, 112, 144) : 0;
  if (after_white) {
    XDestroyImage(after_white);
  }

  int black_input = white_input
      && click(display, window, 112, 48)
      && click(display, window, 112, 112);
  pause_ms(500);
  XImage* after_black = capture(display, window,
    "native-mini-after-black-d7-d5.ppm");
  int have_after_black = after_black != NULL;
  uint32_t black_source = after_black ? rgb(display, after_black, 112, 48) : 0;
  uint32_t black_target = after_black ? rgb(display, after_black, 112, 112) : 0;
  uint32_t shift_origin_before = after_black
      ? rgb(display, after_black, 80, 176) : 0;
  uint32_t shift_target_before = after_black
      ? rgb(display, after_black, 176, 144) : 0;
  if (after_black) {
    XDestroyImage(after_black);
  }

  int shift_input = black_input
      && click(display, window, 112, 144)
      && click(display, window, 144, 176);
  pause_ms(500);
  XImage* after_shift = capture(display, window,
    "native-mini-after-white-shift-5-to-6.ppm");
  int have_after_shift = after_shift != NULL;
  uint32_t shift_origin_after = after_shift
      ? rgb(display, after_shift, 80, 176) : 0;
  uint32_t shift_target_after = after_shift
      ? rgb(display, after_shift, 176, 144) : 0;
  if (after_shift) {
    XDestroyImage(after_shift);
  }

  int white_move_visible = white_input && have_after_white
      && before_source != white_source
      && before_target != white_target
      && white_target == 16314837;
  int black_move_visible = black_input && have_after_black
      && black_source == 7252433
      && black_target == 1185570;
  int shift_visible = shift_input && have_after_shift
      && shift_origin_before != 1514535
      && shift_origin_after == 1514535
      && shift_target_before == 1514535
      && shift_target_after == 16314837;
  printf("window=Rift Chess Experimental Native Mini visible=1 size=%dx%d\n",
    attrs.width, attrs.height);
  printf("d2_center_before=#%06x d4_center_before=#%06x\n",
    before_source, before_target);
  printf("white_d2_d4_source=#%06x target=#%06x expected_white=#f8f1d5\n",
    white_source, white_target);
  printf("black_d7_d5_source=#%06x target=#%06x expected_black=#121722\n",
    black_source, black_target);
  printf("white_shift_5_to_6_before=#%06x/#%06x after=#%06x/#%06x expected_hole=#171c27\n",
    shift_origin_before, shift_target_before,
    shift_origin_after, shift_target_after);
  printf("clicks=6 white_move=%s black_move=%s rift_shift=%s\n",
    white_move_visible ? "yes" : "no",
    black_move_visible ? "yes" : "no",
    shift_visible ? "yes" : "no");

  send_escape(display, window);
  XSync(display, False);
  int clean_exit = exited_successfully(child, 5);
  XCloseDisplay(display);
  printf("escape_close_exit_zero=%s\n", clean_exit ? "yes" : "no");
  return white_move_visible && black_move_visible && shift_visible
      && clean_exit ? 0 : 1;
}
