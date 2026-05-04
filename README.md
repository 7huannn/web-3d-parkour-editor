# Character Controller Sample Project

Ứng dụng 3D xây map parkour và chạy thử trực tiếp trong trình duyệt, dùng React + Three.js + Rapier Physics.

## Tính năng chính

- Chế độ **Build**: chọn block và click vào scene để đặt map.
- Chế độ **Play**: điều khiển nhân vật chạy/jump/sprint trên map đã tạo.
- Hệ block đa dạng: platform, ramp, box, sphere, cone, cylinder, wheel, teapot, checkpoint, hazard, finish, building.
- HUD điều chỉnh runtime:
  - Render mode (`solid`, `lines`, `points`)
  - Transform mode (`translate`, `rotate`, `scale`)
  - Texture mapping từ file ảnh
  - Tham số camera projection (`near`, `far`, `offsetX`, `height`, `distance`)
- Có sẵn sample map (`modern`, `compact`) để test nhanh.
- Hỗ trợ mobile control.

## Công nghệ

- React 18 + TypeScript
- Vite 5
- `@react-three/fiber`, `@react-three/drei`
- `@react-three/rapier`
- `@react-three/postprocessing`
- Tailwind CSS
- Leva (debug controls)

## Yêu cầu môi trường

- Node.js **18+**
- npm

## Cài đặt và chạy

```bash
npm install
npm run dev
```

Mở URL Vite hiển thị trong terminal (thường là `http://localhost:5173`).

## Scripts

```bash
npm run dev      # chạy môi trường development
npm run build    # build production
npm run preview  # preview bản build
npm run lint     # chạy eslint
```

## Điều khiển

- Di chuyển: `WASD` hoặc `Arrow Keys`
- Nhảy: `Space`
- Chạy nhanh: `Shift`
- Restart: `R`
- Nudge transform: `I/K` (trục Z), `J/L` (trục X), `U/O` (trục Y)

## Cấu trúc thư mục chính

```text
src/
  components/   # character, camera, map builder, game UI
  contexts/     # mobile controls context
  hooks/        # controls cho ánh sáng, camera, post-processing...
  shaders/      # custom shader
  types/        # kiểu dữ liệu game/editor
  utils/        # helper vật lý và tiện ích
public/
  models/       # model 3D (.glb)
```

## Gợi ý quy trình làm việc

1. Vào `Build`, chọn block, click để đặt map.
2. Chuyển `Play` để test đường chạy.
3. Dùng `checkpoint` + `finish` để tạo flow hoàn chỉnh.
4. Tinh chỉnh render/texture/camera từ HUD bên phải.
