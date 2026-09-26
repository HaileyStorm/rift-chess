# Game-owned resource names and strict decoder for the standard chess sprites.
# The browser/native ports only fetch the bounded bytes; Bend selects artwork.
import Base
import ./PieceSprites.bend as Sprites

type AssetRequest is Data:
  AssetRequest{id: U32, path: String, max_bytes: U32}

type AssetResponse is Data:
  AssetResponse{id: U32, bytes: List<&2,U32>, ok: Bool}

def asset_ids() -> List<&2,AssetRequest>:
  [AssetRequest{0,"assets/pieces-fast-0.rga",65541},
   AssetRequest{1,"assets/pieces-fast-1.rga",65541},
   AssetRequest{2,"assets/pieces-fast-2.rga",65541}]

def decode_if(valid: Bool, bytes: List<&2,U32>) -> Maybe<&2,Sprites.Page>:
  match valid:
    case False{}: None{}
    case True{}: Sprites.decode_page(bytes,7)

def decoded(expected: U32, response: AssetResponse) -> Maybe<&2,Sprites.Page>:
  match response:
    case AssetResponse{id,bytes,ok}:
      decode_if(Bool.and(ok,U32.is_eq(id,expected)),bytes)

def prepared_pages(page0: Maybe<&2,Sprites.Page>,
  page1: Maybe<&2,Sprites.Page>, page2: Maybe<&2,Sprites.Page>) ->
  Maybe<&2,Sprites.Pieces>:
  match page0 page1 page2:
    case Some{a} Some{b} Some{c}: Some{Sprites.prepare(a,b,c)}
    case _ _ _: None{}

def prepared(responses: List<&2,AssetResponse>) -> Maybe<&2,Sprites.Pieces>:
  match responses:
    case first <> second <> third <> Nil{}:
      prepared_pages(decoded(0,first),decoded(1,second),decoded(2,third))
    case _: None{}
