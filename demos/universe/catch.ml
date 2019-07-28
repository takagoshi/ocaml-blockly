open UniverseJs
open World
open Image
open Color
open TransformToInt

(* world_t : 果物の座標, 鳥の座標, スコア の組の型 *)
type world_t = {
  apple : int * int;    (* りんごの位置 *)
  banana : int * int;   (* バナナの位置 *)
  melon : int * int;    (* メロンの位置 *)
  orange : int * int;   (* オレンジの位置 *)
  peach : int * int;    (* 桃の位置 *)
  bird : int * int;     (* 鳥の位置 *)
  score : int;          (* スコア *)
}

(* -----画像関係----- *)

(* 画面の幅 *)
let width = 560

(* 画面の高さ *)
let height = 560

(* フルーツの画像の横幅. 縦も同じ *)
let image_width = 100

(* 鳥の横幅. 縦も同じ *)
let bird_width  = 150

(* 背景画像 *)
let background =
  read_image "http://pllab.is.ocha.ac.jp/~asai/picture/images/background.png"

(* りんご *)
let apple =
  read_image "http://pllab.is.ocha.ac.jp/~asai/picture/images/apple.png"

(* バナナ *)
let banana =
  read_image "http://pllab.is.ocha.ac.jp/~asai/picture/images/banana.png"

(* メロン *)
let melon =
  read_image "http://pllab.is.ocha.ac.jp/~asai/picture/images/melon.png"

(* オレンジ *)
let orange =
  read_image "http://pllab.is.ocha.ac.jp/~asai/picture/images/orange.png"

(* 桃 *)
let peach =
  read_image "http://pllab.is.ocha.ac.jp/~asai/picture/images/peach.png"

(* 鳥 *)
let bird =
  read_image "http://pllab.is.ocha.ac.jp/~asai/picture/images/bird.png"

(* -----初期値関係----- *)

(* worldの初期値 *)
let initial_world = {
  apple  = ( 10, 0);
  banana = (120, 0);
  melon  = (230, 0);
  orange = (340, 0);
  peach  = (450, 0);
  bird   = (  0, height - bird_width);
  score  = 0;
}

(* -----スコアの判定関係-----*)

(* 各果物の点数 *)
let apple_score  = 10
let banana_score = 15
let melon_score  =  5
let orange_score = 10
let peach_score  = 20

(* 果物と鳥の座標をもらう *)
(* 果物がキャッチされていたら score、されていなかったら 0 を返す *)
(* check : int * int -> int * int -> int *)
let check (ax, ay) (x, y) score =
  if x <= ax && ax + image_width <= x + bird_width && height - bird_width < ay
  then score
  else 0

(* 各果物をキャッチしているか判定してスコアを出す *)
(* add_score : world_t -> int *)
let add_score {apple = (ax, ay); banana = (bx, by); melon = (mx, my);
               orange = (ox, oy); peach = (px, py); bird = (x, y);
               score = score} =
  check (ax, ay) (x, y) apple_score  +
  check (bx, by) (x, y) banana_score +
  check (mx, my) (x, y) melon_score  +
  check (ox, oy) (x, y) orange_score +
  check (px, py) (x, y) peach_score +
  score

(* -----キー操作関係-----*)

(* on_key : world_t -> string -> world_t *)
let on_key {apple = (ax, ay); banana = (bx, by); melon = (mx, my);
            orange = (ox, oy); peach = (px, py); bird = (x, y);
            score = score} key =
  { apple  = (ax, ay);
    banana = (bx, by);
    melon  = (mx, my);
    orange = (ox, oy);
    peach  = (px, py);
    bird   = ((if key = "left" then x - 10
               else if key = "right" then x + 10
               else x),
              y);
    score  = score }

(* -----on_tick関係----- *)

(* 果物の y 座標が一番下についていたら一番上にもってくる *)
(* up_fruit : int -> int *)
let up_fruit y =
  if height - bird_width < y then 0 else y

(* 各果物の動く縦幅 *)
let apple_y  = 10
let banana_y = 15
let melon_y  =  5
let orange_y = 10
let peach_y  = 20

(* 各果物を下に動かす *)
(* move_apple : int * int -> int * int *)
let move_apple  (x, y) = (x, y + apple_y) 
let move_banana (x, y) = (x, y + banana_y)
let move_melon  (x, y) = (x, y + melon_y)
let move_orange (x, y) = (x, y + orange_y)
let move_peach  (x, y) = (x, y + peach_y)

(* 果物を下に動かす *)
(* 果物が下についたら上にセット *)
(* 果物がキャッチされたらscoreを加算 *)
(* on_tick : world_t -> world_t *)
let on_tick {apple = (ax, ay); banana = (bx, by); melon = (mx, my);
             orange = (ox, oy); peach = (px, py); bird = (x, y);
             score = score} =
  { apple  = move_apple  (ax, up_fruit ay);
    banana = move_banana (bx, up_fruit by);
    melon  = move_melon  (mx, up_fruit my);
    orange = move_orange (ox, up_fruit oy);
    peach  = move_peach  (px, up_fruit py);
    bird   = (x, y);
    score  = add_score {apple = (ax, ay); banana = (bx, by); melon = (mx, my);
                        orange = (ox, oy); peach = (px, py); bird = (x, y);
                        score = score} }

(* -----描画関係----- *)

(* 背景シーン *)
let background_scene = place_image background (0, 0) (empty_scene width height)

let bisque4 = make_color 139 125 107

(* 各座標から画像を作成 *)
(* draw : world_t -> Image.t *)
let draw {apple = (ax, ay); banana = (bx, by); melon = (mx, my);
          orange = (ox, oy); peach = (px, py); bird = (x, y);
          score = score} =
  place_images
    [text (string_of_int score) 50 bisque4;
     bird; peach; orange; melon; banana; apple]
    [(x + bird_width / 2 - 15, y + bird_width / 2);
     (x, y); (px, py); (ox, oy); (mx, my); (bx, by); (ax, ay)]
    background_scene

(* ゲームの動く速さ。単位：ミリ秒 *)
(* rate : int *)
let rate = 500
