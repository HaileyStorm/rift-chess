/* The optional generated header embeds verified model bytes and identity in
   the hash-bound native executable. It is never a tracked weight payload. */
#ifdef RIFT_NATIVE_BOT_BUNDLE
#include RIFT_NATIVE_BOT_BUNDLE
#include "api/native_registry.h"
#include <errno.h>
#include <limits.h>
#include <pthread.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

enum { NATIVE_CPU_MAX_CONTEXT = 1048576, NATIVE_CPU_MAX_HISTORY = 20000,
       NATIVE_CPU_FREE = 0, NATIVE_CPU_QUEUED = 1, NATIVE_CPU_STARTING = 2,
       NATIVE_CPU_RUNNING = 3, NATIVE_CPU_DONE = 4 };

typedef struct {
  uint32_t generation, epoch, revision, request, worker_token;
  int phase, cancelled, released, status, action;
  char* context;
  size_t length;
  uint8_t legal[21760];
} NativeCpuSlot;

static pthread_mutex_t native_cpu_mutex = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t native_cpu_condition = PTHREAD_COND_INITIALIZER;
static pthread_t native_cpu_thread;
static NativeCpuSlot native_cpu_slots[8];
static uint32_t native_cpu_generation = 1;
static int native_cpu_started, native_cpu_stopping, native_cpu_exited;
static rift_native_registry* native_cpu_registry;

typedef struct { char* cursor; char* end; int failed; } NativeCpuReader;

static uint64_t native_cpu_number(NativeCpuReader* r, uint64_t maximum) {
  if (r->failed || r->cursor == r->end || *r->cursor < '0' || *r->cursor > '9') {
    r->failed = 1; return 0;
  }
  char* first = r->cursor;
  uint64_t value = 0;
  while (r->cursor != r->end && *r->cursor >= '0' && *r->cursor <= '9') {
    unsigned digit = (unsigned)(*r->cursor++ - '0');
    if (value > maximum/10 || (value == maximum/10 && digit > maximum%10)) {
      r->failed = 1; return 0;
    }
    value = value*10 + digit;
  }
  if (r->cursor == r->end || *r->cursor++ != ' ' ||
      (r->cursor-first > 2 && *first == '0')) r->failed = 1;
  return value;
}

static rift_position_v1 native_cpu_position(NativeCpuReader* r, int initial) {
  rift_position_v1 p = {0};
  p.version = RIFT_ABI_VERSION; p.size = sizeof(p);
  for (size_t i = 0; i < 64; ++i) {
    uint64_t code = native_cpu_number(r,15);
    if (code == 8) r->failed = 1;
    p.board[i] = code >= 9 ? -(int8_t)(code-8) : (int8_t)code;
  }
  p.holes = (uint16_t)native_cpu_number(r,65535);
  p.side = native_cpu_number(r,1) ? 1 : -1;
  p.castling = (int32_t)native_cpu_number(r,15);
  uint64_t ep = native_cpu_number(r,64), pawn = native_cpu_number(r,64);
  p.ep_target = ep == 64 ? -1 : (int32_t)ep;
  p.ep_pawn = pawn == 64 ? -1 : (int32_t)pawn;
  p.halfmove = (int64_t)native_cpu_number(r,INT64_MAX);
  p.fullmove = (int64_t)native_cpu_number(r,INT64_MAX);
  if (!p.fullmove) r->failed = 1;
  p.repetition_count = initial ? 1 : 0;
  return p;
}

static rift_native_identity_v1 native_cpu_identity(const NativeCpuSlot* slot) {
  rift_native_identity_v1 identity = {0};
  identity.version = RIFT_ABI_VERSION; identity.size = sizeof(identity);
  identity.game_epoch = slot->epoch; identity.revision = slot->revision;
  identity.request_id = slot->request;
  memcpy(identity.model_sha256,rift_native_model_digest,32);
  return identity;
}

/* The dispatcher owns parsing, model copies, thread creation, inference-job
   joins and destruction. None of those operations runs on the frame thread. */
static int native_cpu_start_job(NativeCpuSlot* slot, char* context, size_t length,
  uint32_t* worker_token) {
  NativeCpuReader r = {context,context+length,0};
  if (native_cpu_number(&r,1) != 1) return 1;
  int policy = (int)native_cpu_number(&r,2);
  rift_position_v1 initial = native_cpu_position(&r,1);
  size_t count = (size_t)native_cpu_number(&r,NATIVE_CPU_MAX_HISTORY);
  int32_t* actions = calloc(count ? count : 1,sizeof(*actions));
  if (!actions) return 4;
  for (size_t i = 0; i < count; ++i) actions[i] = (int32_t)native_cpu_number(&r,21759);
  rift_position_v1 current = native_cpu_position(&r,0);
  size_t legal_count = (size_t)native_cpu_number(&r,21760);
  memset(slot->legal,0,sizeof(slot->legal));
  for (size_t i = 0; i < legal_count; ++i) {
    size_t id = (size_t)native_cpu_number(&r,21759);
    if (slot->legal[id]) r.failed = 1;
    slot->legal[id] = 1;
  }
  int status = 1;
  if (!r.failed && r.cursor == r.end && legal_count) {
    rift_native_identity_v1 identity = native_cpu_identity(slot);
    status = rift_native_registry_start(native_cpu_registry,&identity,policy,&initial,actions,count,
      &current,rift_native_model_data,RIFT_NATIVE_MODEL_SIZE,RIFT_NATIVE_SIMULATIONS,
      ((uint64_t)slot->epoch<<32)|slot->request,RIFT_NATIVE_TIME_MS,worker_token);
  }
  free(actions);
  return status;
}

static NativeCpuSlot* native_cpu_find(uint32_t token) {
  if (!token) return NULL;
  NativeCpuSlot* slot = &native_cpu_slots[token&7u];
  return slot->phase != NATIVE_CPU_FREE && slot->generation == (token>>3) ? slot : NULL;
}

static void native_cpu_clear(NativeCpuSlot* slot) {
  free(slot->context); slot->context = NULL; slot->phase = NATIVE_CPU_FREE;
}

static void* native_cpu_dispatch(void* unused) {
  for (;;) {
    int active = 0;
    for (size_t i = 0; i < 8; ++i) {
      NativeCpuSlot* slot = &native_cpu_slots[i];
      pthread_mutex_lock(&native_cpu_mutex);
      if (slot->phase == NATIVE_CPU_QUEUED && (slot->cancelled || native_cpu_stopping))
        native_cpu_clear(slot);
      if (slot->phase == NATIVE_CPU_DONE && (slot->released || slot->cancelled || native_cpu_stopping))
        native_cpu_clear(slot);
      int phase = slot->phase;
      char* context = NULL; size_t length = 0;
      if (phase == NATIVE_CPU_QUEUED) {
        slot->phase = NATIVE_CPU_STARTING;
        context = slot->context; length = slot->length; slot->context = NULL;
      }
      int cancelled = slot->cancelled || native_cpu_stopping;
      uint32_t worker_token = slot->worker_token;
      pthread_mutex_unlock(&native_cpu_mutex);
      if (phase == NATIVE_CPU_QUEUED) {
        int code = native_cpu_start_job(slot,context,length,&worker_token);
        free(context);
        pthread_mutex_lock(&native_cpu_mutex);
        slot->worker_token = worker_token;
        slot->phase = code ? NATIVE_CPU_DONE : NATIVE_CPU_RUNNING;
        slot->status = code ? 5 : 0; slot->action = 0;
        pthread_mutex_unlock(&native_cpu_mutex);
      } else if (phase == NATIVE_CPU_RUNNING) {
        if (cancelled) rift_native_registry_cancel(native_cpu_registry,worker_token);
        rift_native_identity_v1 identity = native_cpu_identity(slot);
        rift_cpu_job_result_v1 result = {RIFT_ABI_VERSION,sizeof(result),0,-1,0};
        int code = rift_native_registry_poll(native_cpu_registry,worker_token,&identity,&result);
        if (code || result.status) {
          if (code) rift_native_registry_cancel(native_cpu_registry,worker_token);
          int reaped = rift_native_registry_release(native_cpu_registry,worker_token);
          if (reaped == 0) {
            if (code || ((result.status == 1 || result.status == 3) &&
                (result.action_id < 0 || result.action_id >= 21760 || !slot->legal[result.action_id]))) {
              result.status = 5; result.action_id = -1;
            }
            pthread_mutex_lock(&native_cpu_mutex);
            slot->worker_token = 0; slot->phase = NATIVE_CPU_DONE;
            slot->status = slot->cancelled || native_cpu_stopping ? 2 : result.status;
            slot->action = slot->status == 1 || slot->status == 3 ? result.action_id+1 : 0;
            pthread_mutex_unlock(&native_cpu_mutex);
          }
        }
      }
      pthread_mutex_lock(&native_cpu_mutex);
      if (slot->phase != NATIVE_CPU_FREE) active = 1;
      pthread_mutex_unlock(&native_cpu_mutex);
    }
    pthread_mutex_lock(&native_cpu_mutex);
    active = 0;
    for (size_t i = 0; i < 8; ++i)
      if (native_cpu_slots[i].phase != NATIVE_CPU_FREE) active = 1;
    if (native_cpu_stopping && !active) {
      pthread_mutex_unlock(&native_cpu_mutex);
      rift_native_registry_destroy(native_cpu_registry);
      native_cpu_registry = NULL;
      pthread_mutex_lock(&native_cpu_mutex); native_cpu_exited = 1;
      pthread_mutex_unlock(&native_cpu_mutex);
      return NULL;
    }
    if (!active && !native_cpu_stopping) pthread_cond_wait(&native_cpu_condition,&native_cpu_mutex);
    pthread_mutex_unlock(&native_cpu_mutex);
    if (active) {
      struct timespec pause = {0,1000000}; nanosleep(&pause,NULL);
    }
  }
}

static int native_cpu_model_matches(Env e, Term value) {
  size_t length = 0; char* text = io_cstr(e,value,&length);
  int matches = length == 64 && memcmp(text,rift_native_model_sha256,64) == 0;
  free(text); return matches;
}

static void native_prepare_call(IoWork* w) {
  w->word = 4;
  if (native_cpu_started || RIFT_NATIVE_BUNDLE_VERSION != 1 ||
      RIFT_NATIVE_MODEL_SIZE != sizeof(rift_native_model_data) ||
      RIFT_NATIVE_MODEL_SIZE == 0 || RIFT_NATIVE_MODEL_SIZE > 4*1024*1024 ||
      strlen(rift_native_model_sha256) != 64 ||
      RIFT_NATIVE_SIMULATIONS < 1 || RIFT_NATIVE_SIMULATIONS > 4096 ||
      RIFT_NATIVE_TIME_MS < 1 || RIFT_NATIVE_TIME_MS > 5000) return;
  for (size_t i = 0; i < 32; ++i) {
    static const char hex[] = "0123456789abcdef";
    if (rift_native_model_sha256[2*i] != hex[rift_native_model_digest[i]>>4] ||
        rift_native_model_sha256[2*i+1] != hex[rift_native_model_digest[i]&15]) return;
  }
  if (rift_native_registry_create(&native_cpu_registry)) return;
  native_cpu_stopping = native_cpu_exited = 0;
  if (pthread_create(&native_cpu_thread,NULL,native_cpu_dispatch,NULL)) {
    rift_native_registry_destroy(native_cpu_registry); native_cpu_registry = NULL; return;
  }
  native_cpu_started = 1; w->word = 1;
}
static Term native_prepare_pack(Env e, IoWork* w) {
  return io_tup(e,w->word,io_str(e,w->word == 1 ? rift_native_model_sha256 : "",w->word == 1 ? 64 : 0));
}
Term native_prepare_run(Env e, Term* f, IoWork* w) {
  return io_work(w,native_prepare_call,native_prepare_pack);
}

Term native_submit_run(Env e, Term* f, IoWork* w) {
  if (!native_cpu_model_matches(e,f[1]) || !(u32)f[2] || !(u32)f[4]) return io_tup(e,1,0);
  size_t length = 0; char* context = io_cstr(e,f[0],&length);
  if (!length || length > NATIVE_CPU_MAX_CONTEXT) { free(context); return io_tup(e,2,0); }
  uint32_t token = 0; int code = 2;
  pthread_mutex_lock(&native_cpu_mutex);
  if (!native_cpu_started || native_cpu_stopping || native_cpu_exited) code = 4;
  else if (native_cpu_generation > (UINT32_MAX>>3)) code = 4;
  else for (uint32_t i = 0; i < 8; ++i) if (native_cpu_slots[i].phase == NATIVE_CPU_FREE) {
    NativeCpuSlot* slot = &native_cpu_slots[i];
    memset(slot,0,sizeof(*slot)); slot->generation = native_cpu_generation++;
    slot->epoch = (u32)f[2]; slot->revision = (u32)f[3]; slot->request = (u32)f[4];
    slot->context = context; slot->length = length; slot->phase = NATIVE_CPU_QUEUED;
    token = (slot->generation<<3)|i; code = 0; context = NULL;
    pthread_cond_signal(&native_cpu_condition); break;
  }
  pthread_mutex_unlock(&native_cpu_mutex); free(context);
  return io_tup(e,code,token);
}

Term native_poll_run(Env e, Term* f, IoWork* w) {
  if (!native_cpu_model_matches(e,f[1])) return io_tup(e,3,io_tup(e,0,0));
  int code = 3, status = 0, action = 0;
  pthread_mutex_lock(&native_cpu_mutex);
  NativeCpuSlot* slot = native_cpu_find((u32)f[0]);
  if (slot && !slot->released && slot->epoch == (u32)f[2] &&
      slot->revision == (u32)f[3] && slot->request == (u32)f[4]) {
    code = 0;
    if (slot->phase == NATIVE_CPU_DONE) {
      status = slot->cancelled ? 2 : slot->status;
      action = status == 1 || status == 3 ? slot->action : 0;
    }
  }
  pthread_mutex_unlock(&native_cpu_mutex);
  return io_tup(e,code,io_tup(e,status,action));
}
Term native_cancel_run(Env e, Term* f, IoWork* w) {
  int code = 3;
  pthread_mutex_lock(&native_cpu_mutex);
  NativeCpuSlot* slot = native_cpu_find((u32)f[0]);
  if (slot) { slot->cancelled = slot->released = 1; code = 0; pthread_cond_signal(&native_cpu_condition); }
  pthread_mutex_unlock(&native_cpu_mutex); return code;
}
Term native_release_run(Env e, Term* f, IoWork* w) {
  int code = 3;
  pthread_mutex_lock(&native_cpu_mutex);
  NativeCpuSlot* slot = native_cpu_find((u32)f[0]);
  if (slot) { code = slot->phase == NATIVE_CPU_DONE ? 0 : 2;
    if (!code) { slot->released = 1; pthread_cond_signal(&native_cpu_condition); } }
  pthread_mutex_unlock(&native_cpu_mutex); return code;
}
Term native_close_run(Env e, Term* f, IoWork* w) {
  pthread_mutex_lock(&native_cpu_mutex);
  if (!native_cpu_started) { pthread_mutex_unlock(&native_cpu_mutex); return 0; }
  native_cpu_stopping = 1; pthread_cond_signal(&native_cpu_condition);
  int exited = native_cpu_exited;
  pthread_mutex_unlock(&native_cpu_mutex);
  if (!exited) return 2;
  int code = pthread_tryjoin_np(native_cpu_thread,NULL);
  if (code == EBUSY) return 2;
  if (code) return 4;
  native_cpu_started = 0; return 0;
}

#else
Term native_prepare_run(Env e, Term* f, IoWork* w) { return io_tup(e,0,io_str(e,"",0)); }
Term native_submit_run(Env e, Term* f, IoWork* w) { return io_tup(e,1,0); }
Term native_poll_run(Env e, Term* f, IoWork* w) { return io_tup(e,1,io_tup(e,0,0)); }
Term native_cancel_run(Env e, Term* f, IoWork* w) { return 1; }
Term native_release_run(Env e, Term* f, IoWork* w) { return 1; }
Term native_close_run(Env e, Term* f, IoWork* w) { return 0; }
#endif

static void __attribute__((constructor)) native_cpu_effects_use(void) {
#ifdef CID_NATIVE_PREPARE
  io_eff(CID_NATIVE_PREPARE,native_prepare_run,0);
  io_eff(CID_NATIVE_SUBMIT,native_submit_run,0);
  io_eff(CID_NATIVE_POLL,native_poll_run,0);
  io_eff(CID_NATIVE_CANCEL,native_cancel_run,0);
  io_eff(CID_NATIVE_RELEASE,native_release_run,0);
  io_eff(CID_NATIVE_CLOSE,native_close_run,0);
#else
  io_eff(CID(native_prepare),native_prepare_run,0);
  io_eff(CID(native_submit),native_submit_run,0);
  io_eff(CID(native_poll),native_poll_run,0);
  io_eff(CID(native_cancel),native_cancel_run,0);
  io_eff(CID(native_release),native_release_run,0);
  io_eff(CID(native_close),native_close_run,0);
#endif
}
