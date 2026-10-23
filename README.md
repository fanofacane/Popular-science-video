# 科普视频

- `STYLE_GUIDE.md`：风格指南（所有期通用）
- `engine/`：渲染工具（通用）
  - `render.mjs`：逐帧渲染一个动画页面，或截几张图
  - `render-parallel.sh`：分 4 段同时渲染，再拼成一个视频
- `episodes/`：每期一个文件夹
  - `脚本.md`：逐字稿、时间轴、数据来源
  - `animation.html`：画面动画源文件
  - `assets/`：素材（如配音）
  - `output/`：成片、样片、截图、主题卡

## 目前的几期

| 期 | 主题 | 成片 |
|---|---|---|
| 01 | 失望性情感隔离 | `episodes/01-失望性情感隔离/output/成片-75s.mp4` |
| 02 | 不认命 | `episodes/02-不认命/output/成片-48s.mp4` |

## 渲染

第一次使用先装依赖：`cd engine && npm install`

```
# 整片（4 段并行）
engine/render-parallel.sh episodes/02-不认命/animation.html episodes/02-不认命/output/成片-48s.mp4

# 截几张图看画面（秒）
cd engine && node render.mjs ../episodes/02-不认命/animation.html ../out/stills --stills 5,12,20
```
