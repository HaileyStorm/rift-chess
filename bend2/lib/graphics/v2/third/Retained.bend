# DRAFT opt-in retained metadata with stable U32 IDs and revision tokens.
# Bounds/order/removal changes are automatic. The caller MUST change revision
# for any pixel-affecting edit not reflected in bounds (source, clip, opacity,
# glyph content, material etc.). Background changes require explicit full damage.
# At most 1024 unique IDs; a persistent 32-bit radix index avoids quadratic lookup.
import Base
import ../DrawList.bend as Draw
import ../Rect.bend as Rect
import ../RenderPlan.bend as Plan

type Item is Data:
  Item{id: U32,revision: U32,command: Draw.Command,interactive: Bool}

type Entry is Data:
  Entry{id: U32,revision: U32,order: U32,bounds: Rect.Box,command: Draw.Command,interactive: Bool}

type Index is Data:
  Empty{}
  Leaf{entry: Entry}
  Fork{zero: Index,one: Index}

type Snapshot is Data:
  Snapshot{entries: List<&2,Entry>,index: Index}

# Expose only a stable identity, leaving event meaning to the application.
def id(entry: Entry) -> U32:
  match entry:
    case Entry{id,revision,order,bounds,command,interactive}: id

# Empty index children preserve total bounded lookup behavior.
def zero(index: Index) -> Index:
  match index:
    case Fork{zero,one}: zero
    case _: Empty{}

# Select the high child without sharing a mutable map handle.
def one(index: Index) -> Index:
  match index:
    case Fork{zero,one}: one
    case _: Empty{}

# Conditional index child selection uses the remaining high-order ID bit.
def choose(bit: Bool,zero: Index,one: Index) -> Index:
  match bit:
    case False{}: zero
    case True{}: one

# Lookup exact IDs through at most 32 immutable nodes.
def get(+fuel: Nat,index: Index,+key: U32) -> Maybe<Entry>:
  match fuel index:
    case _ Empty{}: None{}
    case 0n Leaf{entry}: Some{entry}
    case 0n Fork{zero,one}: None{}
    case 1n+rest Leaf{entry}: None{}
    case 1n+rest Fork{zero,one}:
      get(rest,choose(U32.is_ne(U32.and(U32.shrn(key,rest),1),0),zero,one),key)

# Assemble one radix fork after replacing exactly one child.
def inserted(bit: Bool,changed: Index,zero: Index,one: Index) -> Index:
  match bit:
    case False{}: Fork{changed,one}
    case True{}: Fork{zero,changed}

# Persistent insertion; duplicate detection belongs to the public snapshot builder.
def put(+fuel: Nat,+index: Index,+entry: Entry) -> Index:
  match fuel:
    case 0n: Leaf{entry}
    case 1n+rest:
      +bit = U32.is_ne(U32.and(U32.shrn(id(entry),rest),1),0)
      inserted(bit,put(rest,choose(bit,zero(index),one(index)),entry),zero(index),one(index))

# Detect duplicate keys before extending the snapshot.
def absent(value: Maybe<Entry>) -> Bool:
  match value:
    case None{}: True{}
    case Some{entry}: False{}

# Convert successful tail construction back into the original painter order.
def prepend(entry: Entry,result: Maybe<Snapshot>) -> Maybe<Snapshot>:
  match result:
    case None{}: None{}
    case Some{Snapshot{entries,index}}: Some{Snapshot{Con{entry,entries},index}}

# Build state is explicit; invalid/duplicate keys never yield a partial snapshot.
def build(fuel: Nat,items: List<&2,Item>,+order: U32,+index: Index,valid: Bool) -> Maybe<Snapshot>:
  match fuel items valid:
    case _ _ False{}: None{}
    case _ Nil{} True{}: Some{Snapshot{Nil{},index}}
    case 0n Con{item,tail} True{}: None{}
    case 1n+rest Con{Item{+id,revision,+command,interactive},tail} True{}:
      +entry = {Entry{id,revision,order,Draw.bounds(command),command,interactive} : Entry}
      prepend(entry,build(rest,tail,U32.add(order,1),put(32n,index,entry),absent(get(32n,index,id))))

# Snapshot input command order is painter execution order, not z-sort policy.
def snapshot(items: List<&2,Item>) -> Maybe<Snapshot>:
  build(1024n,items,0,Empty{},True{})

# Exact integer bounds comparison does not inspect potentially large source trees.
def same_box(a: Rect.Box,b: Rect.Box) -> Bool:
  match a b:
    case Rect.Box{al,at,ar,ab} Rect.Box{bl,bt,br,bb}:
      Bool.and(Bool.and(U32.is_eq(al,bl),U32.is_eq(at,bt)),Bool.and(U32.is_eq(ar,br),U32.is_eq(ab,bb)))

# Revision and order must both match; unrelated insertions may conservatively
# damage more objects, but can never hide an actual painter-order change.
def same(a: Entry,b: Entry) -> Bool:
  match a b:
    case Entry{aid,ar,ao,ab,ac,ai} Entry{bid,br,bo,bb,bc,bi}:
      Bool.and(Bool.and(U32.is_eq(ar,br),U32.is_eq(ao,bo)),same_box(ab,bb))

# Empty bounds do not create spurious damage rectangles.
def add_box(+box: Rect.Box,+damage: List<&2,Rect.Box>) -> List<&2,Rect.Box>:
  match box:
    case Rect.Box{+l,+t,+r,+b}:
      Bool.pick(List<&2,Rect.Box>,Bool.or(U32.is_ge(l,r),U32.is_ge(t,b)),damage,Con{Rect.Box{l,t,r,b},damage})

# Extract a command's old/new footprint without exposing rendering policy.
def bounds(entry: Entry) -> Rect.Box:
  match entry:
    case Entry{id,revision,order,bounds,command,interactive}: bounds

# An unchanged entry adds no damage; changed entries include BOTH footprints.
def changed(equal: Bool,old: Entry,current: Entry,damage: List<&2,Rect.Box>) -> List<&2,Rect.Box>:
  match equal:
    case True{}: damage
    case False{}: add_box(bounds(old),add_box(bounds(current),damage))

# Newly inserted objects damage their new footprint even without an old counterpart.
def compare(old: Maybe<Entry>,+current: Entry,damage: List<&2,Rect.Box>) -> List<&2,Rect.Box>:
  match old:
    case None{}: add_box(bounds(current),damage)
    case Some{+entry}: changed(same(entry,current),entry,current,damage)

# Scan current objects in linear count with bounded radix lookup per object.
def additions(entries: List<&2,Entry>,+old: Index,damage: List<&2,Rect.Box>) -> List<&2,Rect.Box>:
  match entries:
    case Nil{}: damage
    case Con{+entry,tail}: additions(tail,old,compare(get(32n,old,id(entry)),entry,damage))

# An absent old object must restore its previously covered background region.
def removed(present: Maybe<Entry>,old: Entry,damage: List<&2,Rect.Box>) -> List<&2,Rect.Box>:
  match present:
    case Some{entry}: damage
    case None{}: add_box(bounds(old),damage)

# Scan removals independently so the final removed item is not overlooked.
def removals(entries: List<&2,Entry>,+current: Index,damage: List<&2,Rect.Box>) -> List<&2,Rect.Box>:
  match entries:
    case Nil{}: damage
    case Con{+entry,tail}: removals(tail,current,removed(get(32n,current,id(entry)),entry,damage))

# Return conservative old/new/reorder/removal damage; no dedup/minimality claim.
def damage(old: Snapshot,current: Snapshot) -> List<&2,Rect.Box>:
  match old current:
    case Snapshot{old_entries,old_index} Snapshot{new_entries,new_index}:
      removals(old_entries,new_index,additions(new_entries,old_index,Nil{}))

# Recover the exact original ordered draw commands for existing planner APIs.
def commands(entries: List<&2,Entry>) -> List<&2,Draw.Command>:
  match entries:
    case Nil{}: Nil{}
    case Con{Entry{id,revision,order,bounds,command,interactive},tail}: Con{command,commands(tail)}

# Prepare a current snapshot without imposing a partition/fork/cache policy.
def prepare(snapshot: Snapshot,cuts: Nat,depth: Nat,size: U32) -> Plan.Frame:
  match snapshot:
    case Snapshot{entries,index}: Plan.prepare(cuts,depth,size,commands(entries))

# Keep the last interactive bounding-box hit, matching painter-front order.
def hit_entry(entry: Entry,x: U32,y: U32,previous: Maybe<U32>) -> Maybe<U32>:
  match entry:
    case Entry{id,revision,order,bounds,command,interactive}:
      Bool.pick(Maybe<U32>,Bool.and(interactive,Rect.point(bounds,x,y)),Some{id},previous)

# Broad-phase bounds picking only; use Shape.hit/alpha tests for exact geometry.
def hits(entries: List<&2,Entry>,+x: U32,+y: U32,previous: Maybe<U32>) -> Maybe<U32>:
  match entries:
    case Nil{}: previous
    case Con{entry,tail}: hits(tail,x,y,hit_entry(entry,x,y,previous))

# Return a stable ID or None, with no pointer-capture/focus/game semantics.
def pick(snapshot: Snapshot,x: U32,y: U32) -> Maybe<U32>:
  match snapshot:
    case Snapshot{entries,index}: hits(entries,x,y,None{})
