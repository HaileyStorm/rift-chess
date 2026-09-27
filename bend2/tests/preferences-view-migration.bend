import Base
import ../graphics/Camera.bend as Camera
import ../ui/Records.bend as Records

def is_view(v: Camera.View, +yaw: U32, +pitch: U32, +zoom: U32) -> Bool:
  match v:
    case Camera.View{y,p,z}:
      Bool.and(U32.is_eq(y,yaw),Bool.and(U32.is_eq(p,pitch),U32.is_eq(z,zoom)))

def migration_ok() -> Bool:
  +migrated = Records.migrate_legacy_default(Camera.View{345,52,115})
  +custom = Records.migrate_legacy_default(Camera.View{330,52,115})
  +already_new = Records.migrate_legacy_default(Camera.View{345,67,115})
  Bool.and(is_view(migrated,345,67,115),
    Bool.and(is_view(custom,330,52,115),is_view(already_new,345,67,115)))

def report(check: Bool) -> IO(Unit):
  match check:
    case True{}: IO.print("PASS: saved old default migrates; custom and new views survive")
    case False{}: IO.die(Unit,1,"Saved view migration changed a custom angle")

def main() -> IO(Unit):
  report(migration_ok())
