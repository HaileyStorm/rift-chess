# Whole-process native benchmark for stable-pose soft-alpha sprites.
# Both versions share source, pose, alpha rule, per-frame changing background,
# draw order, and all-pixel checksum. Cached preparation is paid once per process.
import Base
import ../../MaskedStamp.bend as Stamp
import ../../third/PreparedSprite.bend as Cached
import ../../RenderPlan.bend as Plan
import ../../DrawList.bend as Draw
import ../../Texture.bend as Texture
import ../../Rect.bend as Rect
import ../../Shapes.bend as Shapes
import ../NativePlanWork.bend as Checksum

# Same deliberately unaligned positions for both paths.
def x(index: U32) -> U32:
  U32.add(U32.mul(U32.mod(index,8),61),7)

# Vertical spacing avoids total occlusion and preserves soft-alpha work.
def y(index: U32) -> U32:
  U32.add(U32.mul(U32.div(index,8),117),11)

# Cache only immutable source pose/scissor; runtime opacity/background stay dynamic.
def patches(count: Nat,+index: U32,+colors: Image,+mask: Image) -> List<&2,Draw.Command>:
  match count:
    case 0n: Nil{}
    case 1n+rest:
      Con{Cached.command(Cached.prepare(9n,512,5n,32,Shapes.Pos{x(index)},Shapes.Pos{y(index)},colors,mask,Rect.screen(512)),217),patches(rest,U32.add(index,1),colors,mask)}

# The retained immediate reference performs the original source lookup every draw.
def immediate(count: Nat,+index: U32,+colors: Image,+mask: Image,target: Image) -> Image:
  match count:
    case 0n: target
    case 1n+rest:
      immediate(rest,U32.add(index,1),colors,mask,Stamp.draw(9n,512,5n,32,Shapes.Pos{x(index)},Shapes.Pos{y(index)},colors,mask,217,target))

# One frame chooses one explicit pipeline; neither silently changes scene policy.
def frame(cached: Bool,plan: Plan.Frame,forks: Nat,colors: Image,mask: Image,background: Image) -> Image:
  match cached:
    case False{}: immediate(32n,0,colors,mask,background)
    case True{}: Plan.render(plan,forks,background)

# Changing seed prevents a constant image being reused across timing rounds.
def loop(rounds: Nat,+cached: Bool,+plan: Plan.Frame,+forks: Nat,+colors: Image,+mask: Image,+seed: U32,acc: U32) -> U32:
  match rounds:
    case 0n: acc
    case 1n+rest:
      +result = frame(cached,plan,forks,colors,mask,Pix{seed})
      loop(rest,cached,plan,forks,colors,mask,U32.add(seed,17),U32.xor(U32.mul(acc,16777619),Checksum.checksum(9n,result)))

# Avoid charging unused cache preparation to the baseline.
def prepared(cached: Bool,colors: Image,mask: Image) -> Plan.Frame:
  match cached:
    case False{}: Plan.Frame{9n,512,Plan.Keep{}}
    case True{}: Plan.prepare(3n,9n,512,patches(32n,0,colors,mask))

# Fixed workload: 32 sprites, 512² canvas, 24 complete render/checksum rounds.
def run(+cached: Bool,forks: Nat) -> U32:
  +colors = Texture.serial_tree(5n,32,0,0,Texture.Grain{1057074,10042319,180,719})
  +mask = Texture.serial_tree(5n,32,0,0,Texture.Grain{4194304,14680064,211,417})
  loop(24n,cached,prepared(cached,colors,mask),forks,colors,mask,1445933,2166136261)
