let place_image image zahyou scene = ?
let rectangle xFloat yFloat color = ?
let make_color r g b = ?
let empty_scene xFloat yFloat = ?

let width = 300.
let height = 400.
let background = empty_scene width height

type world_t = {
  a : float * float;
}

let initial_world = {a=(30., 20.)}

let draw world = match world with
  {a = (x, y)} -> background

let on_tick world = match world with
  {a = (x, y)} -> {a = (x, y)}

let on_mouse world x y event = match world with
  {a = (x, y)} -> {a = (x, y)}

let on_key world key = match world with
  {a = (x, y)} -> {a = (x, y)}

let draw_last world = match world with
  {a = (x, y)} -> draw world

let finished world = match world with
  {a = (x, y)} -> false

let rate = 1.
