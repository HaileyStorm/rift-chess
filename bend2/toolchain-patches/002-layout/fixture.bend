import Base

type Wide is Data:
  Wide{a: U32, b: U32, c: U32, d: U32}

type Tree is Data:
  Tip{x: U32}
  Branch{left: Tree, right: Tree}

def pass(x: Wide) -> Wide:
  x

def leaf(x: U32) -> Tree:
  Tip{x}

def fork(+x: U32) -> Tree:
  left right = leaf(x) leaf(x)
  Branch{left, right}

def main() -> Tree:
  fork!(3)
