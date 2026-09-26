#define _POSIX_C_SOURCE 200809L

#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/keysym.h>

#include <errno.h>
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

enum { WINDOW_WIDTH = 1024, WINDOW_HEIGHT = 640 };

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
  if (name) XFree(name);
  return matched;
}

static void find_title(Display* display, Window parent, const char* title,
  int depth, WindowMatch* best) {
  if (depth > 12) return;
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
  if (!XQueryTree(display, parent, &root, &next_parent, &children, &count)) return;
  for (unsigned int i = 0; i < count; i += 1)
    find_title(display, children[i], title, depth + 1, best);
  if (children) XFree(children);
}

static Window find_visible_title(Display* display, const char* title) {
  WindowMatch best = { None, -1 };
  find_title(display, DefaultRootWindow(display), title, 0, &best);
  return best.window;
}

static Window wait_for_window(Display* display, const char* title) {
  for (int i = 0; i < 300; i += 1) {
    Window window = find_visible_title(display, title);
    if (window != None) return window;
    pause_ms(100);
  }
  return None;
}

static unsigned int channel(unsigned long pixel, unsigned long mask) {
  if (mask == 0) return 0;
  int shift = 0;
  while ((mask & 1) == 0) {
    mask >>= 1;
    shift += 1;
  }
  unsigned long value = (pixel >> shift) & mask;
  return (unsigned int)((value * 255 + mask / 2) / mask);
}

static uint32_t rgb(XImage* image, int x, int y) {
  unsigned long pixel = XGetPixel(image, x, y);
  return (channel(pixel, image->red_mask) << 16)
      | (channel(pixel, image->green_mask) << 8)
      | channel(pixel, image->blue_mask);
}

static uint64_t pixel_hash(XImage* image) {
  uint64_t hash = UINT64_C(1469598103934665603);
  for (int y = 0; y < image->height; y += 1) {
    for (int x = 0; x < image->width; x += 1) {
      uint32_t color = rgb(image, x, y);
      for (int shift = 16; shift >= 0; shift -= 8) {
        hash ^= (color >> shift) & 0xff;
        hash *= UINT64_C(1099511628211);
      }
    }
  }
  return hash;
}

static int write_ppm(XImage* image, const char* path) {
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
      uint32_t color = rgb(image, x, y);
      unsigned char bytes[3] = {
        (unsigned char)(color >> 16),
        (unsigned char)(color >> 8),
        (unsigned char)color
      };
      if (fwrite(bytes, sizeof bytes, 1, file) != 1) {
        fclose(file);
        return 0;
      }
    }
  }
  return fclose(file) == 0;
}

static int output_path(char* path, size_t capacity, const char* directory,
  const char* filename) {
  int n = snprintf(path, capacity, "%s/%s", directory, filename);
  return n > 0 && (size_t)n < capacity;
}

static XImage* capture(Display* display, Window window, const char* directory,
  const char* filename) {
  XWindowAttributes attrs;
  if (!XGetWindowAttributes(display, window, &attrs)
      || attrs.width != WINDOW_WIDTH || attrs.height != WINDOW_HEIGHT
      || attrs.map_state != IsViewable) {
    fprintf(stderr, "native window changed size or visibility before capture\n");
    return NULL;
  }
  char path[4096];
  if (!output_path(path, sizeof path, directory, filename)) {
    fprintf(stderr, "capture path is too long\n");
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
  if (!write_ppm(image, path)) {
    XDestroyImage(image);
    return NULL;
  }
  return image;
}

static uint64_t differing_pixels(XImage* a, XImage* b,
  int left, int top, int width, int height) {
  if (!a || !b || a->width != b->width || a->height != b->height) return UINT64_MAX;
  int x0 = left < 0 ? 0 : left;
  int y0 = top < 0 ? 0 : top;
  int x1 = left + width > a->width ? a->width : left + width;
  int y1 = top + height > a->height ? a->height : top + height;
  uint64_t count = 0;
  for (int y = y0; y < y1; y += 1)
    for (int x = x0; x < x1; x += 1)
      if (rgb(a, x, y) != rgb(b, x, y)) count += 1;
  return count;
}

static void square_center(int file, int rank, int piece_body, int* x, int* y) {
  const double scale = 45.0;
  const double sin_pitch = sin(65.0 * 3.14159265358979323846 / 180.0);
  double row = 7.0 - (double)rank;
  *x = 256 + (int)lround(256.0 + scale * ((double)file - 3.5));
  *y = 64 + (int)lround(274.0 + scale * sin_pitch * (row - 3.5))
      - (piece_body ? 8 : 0);
}

static int send_button(Display* display, Window window, int type, int x, int y) {
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
  event.xbutton.button = Button1;
  event.xbutton.same_screen = True;
  long mask = type == ButtonPress ? ButtonPressMask : ButtonReleaseMask;
  int sent = XSendEvent(display, window, False, mask, &event);
  XFlush(display);
  return sent != 0;
}

static int click(Display* display, Window window, int x, int y) {
  if (!send_button(display, window, ButtonPress, x, y)) return 0;
  pause_ms(60);
  if (!send_button(display, window, ButtonRelease, x, y)) return 0;
  pause_ms(250);
  return 1;
}

static int send_escape(Display* display, Window window) {
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
  int sent = XSendEvent(display, window, False, KeyPressMask, &event);
  XFlush(display);
  return sent != 0;
}

static int send_window_close(Display* display, Window window) {
  Atom protocols = XInternAtom(display, "WM_PROTOCOLS", False);
  Atom close = XInternAtom(display, "WM_DELETE_WINDOW", False);
  XEvent event;
  memset(&event, 0, sizeof event);
  event.xclient.type = ClientMessage;
  event.xclient.display = display;
  event.xclient.window = window;
  event.xclient.message_type = protocols;
  event.xclient.format = 32;
  event.xclient.data.l[0] = (long)close;
  event.xclient.data.l[1] = CurrentTime;
  int sent = XSendEvent(display, window, False, NoEventMask, &event);
  XFlush(display);
  return sent != 0;
}

static int wait_for_exit_zero(pid_t child, int seconds) {
  int status = 0;
  for (int i = 0; i < seconds * 20; i += 1) {
    pid_t result = waitpid(child, &status, WNOHANG);
    if (result == child) {
      if (WIFEXITED(status) && WEXITSTATUS(status) == 0) return 1;
      fprintf(stderr, "NativeV2 wrapper exit status was not zero (status=%d)\n", status);
      return 0;
    }
    if (result < 0) {
      perror("waitpid");
      return 0;
    }
    pause_ms(50);
  }
  fprintf(stderr, "NativeV2 did not exit before its bounded timeout wrapper\n");
  return 0;
}

static int wait_for_window_gone(Display* display, const char* title) {
  for (int i = 0; i < 200; i += 1) {
    XSync(display, False);
    if (find_visible_title(display, title) == None) return 1;
    pause_ms(50);
  }
  return 0;
}

static void wait_for_timeout(pid_t child) {
  int status = 0;
  while (waitpid(child, &status, 0) < 0) {
    if (errno != EINTR) return;
  }
}

int main(int argc, char** argv) {
  const char* title = "Rift Chess Bend2";
  if (argc != 4) {
    fprintf(stderr, "usage: %s /path/to/NativeV2 <runtime-directory-with-assets> <existing-capture-directory>\n", argv[0]);
    return 2;
  }
  if (argv[1][0] != '/' || argv[2][0] != '/' || argv[3][0] != '/') {
    fprintf(stderr, "NativeV2, runtime, and capture paths must be absolute WSL paths\n");
    return 2;
  }
  const char* native_binary = argv[1];
  const char* runtime_directory = argv[2];
  const char* capture_directory = argv[3];
  struct stat out_stat;
  if (stat(native_binary, &out_stat) != 0 || !S_ISREG(out_stat.st_mode)) {
    fprintf(stderr, "NativeV2 path must name a compiled ELF\n");
    return 2;
  }
  if (stat(runtime_directory, &out_stat) != 0 || !S_ISDIR(out_stat.st_mode)) {
    fprintf(stderr, "runtime path must be an existing directory\n");
    return 2;
  }
  char assets_directory[4096];
  if (!output_path(assets_directory, sizeof assets_directory,
        runtime_directory, "assets")
      || stat(assets_directory, &out_stat) != 0 || !S_ISDIR(out_stat.st_mode)) {
    fprintf(stderr, "runtime directory must contain its packaged assets/ directory\n");
    return 2;
  }
  if (stat(capture_directory, &out_stat) != 0 || !S_ISDIR(out_stat.st_mode)) {
    fprintf(stderr, "capture destination must be an existing directory\n");
    return 2;
  }

  char data_template[] = "/tmp/rift-chess-native-v2-XXXXXX";
  char* data_dir = mkdtemp(data_template);
  if (!data_dir || setenv("RIFT_CHESS_DATA_DIR", data_dir, 1) != 0) {
    perror("isolated RIFT_CHESS_DATA_DIR");
    return 2;
  }

  pid_t child = fork();
  if (child < 0) {
    perror("fork");
    return 2;
  }
  if (child == 0) {
    if (chdir(runtime_directory) != 0) {
      perror("chdir runtime directory");
      _exit(127);
    }
    execlp("timeout", "timeout", "--signal=INT", "--kill-after=5s",
      "90s", native_binary, (char*)NULL);
    perror("exec timeout");
    _exit(127);
  }

  Display* display = XOpenDisplay(NULL);
  if (!display) {
    fprintf(stderr, "XOpenDisplay failed; verify the WSLg DISPLAY\n");
    wait_for_timeout(child);
    return 2;
  }
  Window window = wait_for_window(display, title);
  if (window == None) {
    fprintf(stderr, "could not find visible NativeV2 window titled '%s'\n", title);
    wait_for_timeout(child);
    XCloseDisplay(display);
    return 1;
  }
  XWindowAttributes attrs;
  if (!XGetWindowAttributes(display, window, &attrs)
      || attrs.width != WINDOW_WIDTH || attrs.height != WINDOW_HEIGHT
      || attrs.map_state != IsViewable) {
    fprintf(stderr, "NativeV2 window is not a visible 1024x640 client\n");
    send_window_close(display, window);
    wait_for_timeout(child);
    XCloseDisplay(display);
    return 1;
  }
  XRaiseWindow(display, window);
  XSetInputFocus(display, window, RevertToParent, CurrentTime);
  XSync(display, False);
  pause_ms(1000);

  XImage* initial = capture(display, window, capture_directory, "native-v2-initial.ppm");
  if (!initial) {
    send_window_close(display, window);
    wait_for_timeout(child);
    XCloseDisplay(display);
    return 1;
  }
  uint64_t initial_hash = pixel_hash(initial);

  /* Default camera (yaw 0, pitch 65, zoom 100), compact desktop board rect
     (256,64,512,512). Match browser-v2-scenarios: piece-body clicks sit 8px
     above each square center. g1 is a White knight; h3 is legal and non-hole
     in both supported starting hole layouts. */
  int g1_x = 0, g1_y = 0, h3_x = 0, h3_y = 0;
  square_center(6, 0, 1, &g1_x, &g1_y);
  square_center(7, 2, 0, &h3_x, &h3_y);
  int selection_input = click(display, window, g1_x, g1_y);
  XImage* selected = selection_input
      ? capture(display, window, capture_directory, "native-v2-g1-selected.ppm") : NULL;
  uint64_t selection_diff = selected
      ? differing_pixels(initial, selected, 0, 0, WINDOW_WIDTH, WINDOW_HEIGHT) : 0;

  int deselection_input = selected && click(display, window, g1_x, g1_y);
  XImage* deselected = deselection_input
      ? capture(display, window, capture_directory, "native-v2-g1-deselected.ppm") : NULL;
  uint64_t deselection_restore_diff = deselected
      ? differing_pixels(initial, deselected, 0, 0, WINDOW_WIDTH, WINDOW_HEIGHT) : UINT64_MAX;

  int white_move_input = deselected
      && click(display, window, g1_x, g1_y)
      && click(display, window, h3_x, h3_y);
  pause_ms(700);
  XImage* after_move = white_move_input
      ? capture(display, window, capture_directory, "native-v2-after-white-g1-h3.ppm") : NULL;
  uint64_t move_diff = after_move
      ? differing_pixels(initial, after_move, 0, 0, WINDOW_WIDTH, WINDOW_HEIGHT) : 0;
  uint64_t source_diff = after_move
      ? differing_pixels(initial, after_move, g1_x - 32, g1_y - 36, 64, 72) : 0;
  uint64_t target_diff = after_move
      ? differing_pixels(initial, after_move, h3_x - 32, h3_y - 36, 64, 72) : 0;

  XWindowAttributes after_attrs;
  int title_stable = has_title(display, window, title)
      && XGetWindowAttributes(display, window, &after_attrs)
      && after_attrs.map_state == IsViewable
      && after_attrs.width == WINDOW_WIDTH && after_attrs.height == WINDOW_HEIGHT;
  int selected_visible = selection_input && selected && selection_diff > 0;
  int deselected_visible = deselection_input && deselected
      && deselection_restore_diff < selection_diff;
  int white_move_visible = white_move_input && after_move && move_diff > 0
      && source_diff > 0 && target_diff > 0;

  printf("window=%s visible=1 size=%dx%d title_stable=%s\n",
    title, attrs.width, attrs.height, title_stable ? "yes" : "no");
  printf("isolated_RIFT_CHESS_DATA_DIR=%s\n", data_dir);
  printf("runtime_directory=%s\n", runtime_directory);
  printf("captures=%s\n", capture_directory);
  printf("pixels_initial_fnv64=%016llx selected_changed=%llu deselected_restore_changed=%llu\n",
    (unsigned long long)initial_hash,
    (unsigned long long)selection_diff,
    (unsigned long long)deselection_restore_diff);
  printf("board_centers=g1(%d,%d) h3(%d,%d) move_changed=%llu source_changed=%llu target_changed=%llu\n",
    g1_x, g1_y, h3_x, h3_y,
    (unsigned long long)move_diff,
    (unsigned long long)source_diff,
    (unsigned long long)target_diff);
  printf("pointer_select=%s pointer_deselect=%s legal_white_move_g1_h3=%s\n",
    selected_visible ? "yes" : "no",
    deselected_visible ? "yes" : "no",
    white_move_visible ? "yes" : "no");

  if (after_move) XDestroyImage(after_move);
  if (deselected) XDestroyImage(deselected);
  if (selected) XDestroyImage(selected);
  XDestroyImage(initial);

  int escape_sent = send_escape(display, window);
  XSync(display, False);
  pause_ms(250);
  XWindowAttributes escape_attrs;
  int escape_keeps_window = escape_sent && has_title(display, window, title)
      && XGetWindowAttributes(display, window, &escape_attrs)
      && escape_attrs.map_state == IsViewable;
  int close_sent = send_window_close(display, window);
  int clean_exit = wait_for_exit_zero(child, 10);
  int window_gone = clean_exit && wait_for_window_gone(display, title);
  XCloseDisplay(display);
  printf("escape_keeps_window=%s wm_close_sent=%s wm_close_exit_zero=%s window_gone=%s\n",
    escape_keeps_window ? "yes" : "no", close_sent ? "yes" : "no",
    clean_exit ? "yes" : "no", window_gone ? "yes" : "no");
  return title_stable && selected_visible && deselected_visible
      && white_move_visible && escape_keeps_window && close_sent
      && clean_exit && window_gone ? 0 : 1;
}
