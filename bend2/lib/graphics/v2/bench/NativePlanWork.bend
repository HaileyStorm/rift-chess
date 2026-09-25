# Actual native benchmark: immutable prepared scene, whole-pixel checksum.
# Setup is outside the repeated render loop. No foreign/unsafe timing tricks.
import Base
import ../RenderPlan.bend as Plan
import ../DrawList.bend as Draw
import ../RgbaAffine.bend as Affine
import ../RgbaSample.bend as Sample
import ../Transform2D.bend as Transform
import ../Texture.bend as Texture
import ../Rect.bend as Rect

def commands(count: Nat,+index: U32,+texture: Sample.Texture) -> List<&2,Draw.Command>:
  match count:
    case 0n: Nil{}
    case 1n+rest:
      +x = U32.add(U32.mul(U32.mod(index,8),64),10)
      +y = U32.add(U32.mul(U32.div(index,8),64),8)
      +geometry = Affine.prepare(Transform.Matrix{48.0,4.0,F32.neg(3.0),48.0,U32.to_f32(x),U32.to_f32(y)})
      Con{Draw.mapped(geometry,texture,Sample.Linear{},220,Rect.screen(512)),
        commands(rest,U32.add(index,1),texture)}

# This checksum is representation-independent: Pix at nonzero depth means a
# full uniform square and contributes 4^depth copies, exactly as expanded leaves.
def checksum(+depth: Nat,image: Image) -> U32:
  match depth image:
    case _ Pix{color}: U32.mul(color,U32.shln(1,Nat.add(depth,depth)))
    case 0n Qua{a,b,c,d}: 0
    case 1n+rest Qua{tl,tr,bl,br}:
      +a = checksum(rest,tl)
      +b = checksum(rest,tr)
      +c = checksum(rest,bl)
      +d = checksum(rest,br)
      U32.add(U32.add(a,b),U32.add(c,d))

def loop(rounds: Nat,+frame: Plan.Frame,+forks: Nat,+seed: U32,acc: U32) -> U32:
  match rounds:
    case 0n: acc
    case 1n+rest:
      +pixels = Plan.render(frame,forks,Pix{seed})
      +value = checksum(9n,pixels)
      loop(rest,frame,forks,U32.add(seed,17),U32.xor(U32.mul(acc,16777619),value))

def run(forks: Nat,rounds: Nat) -> U32:
  +source = Texture.serial_tree(5n,32,0,0,Texture.Grain{1057074,10042319,180,719})
  +cmds = commands(64n,0,Sample.Texture{5n,32,source,Pix{13107200}})
  +frame = Plan.prepare(3n,9n,512,cmds)
  loop(rounds,frame,forks,1445933,2166136261)
