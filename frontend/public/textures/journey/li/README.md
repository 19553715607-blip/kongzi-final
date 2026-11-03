# 学堂清晨渲染贴图

仅用于礼部现有 3D 场景；所有静态纹理由 `liHostTextures.ts` 中的 drei `useTexture` 加载并共享缓存。
姓名和匾额需要随语言变化，仍使用原来的动态文字 CanvasTexture，以保持 UI 一致。

- `roof-*`：整面屋瓦颜色、法线、粗糙度。青苔烘焙在贴图顶部两角，对应屋顶 UV 的 v=1 檐角；无重复苔痕。
- `wood-*`：低反光旧木、轻微划痕与磨损。
- `stone-*`：同一高度场生成的石缝颜色、法线和粗糙度，避免缝隙错位。
- `cloth-*`：细织纹与缓和褶皱法线，不使用位移。
- `mountains-ink.webp`：透明淡墨山水画，应用于已有远山几何体。
- `mountain-edge-alpha.png`：隐藏原山体尖硬边缘的透明度遮罩。
- `mist-alpha.png`：横向薄雾，在原远山材质内部缓慢滚动；不新增云模型。
- `lantern-glow.png`、`morning-ray.png`：现有光晕、晨光效果的静态纹理。

法线、粗糙度和透明度贴图使用线性数据空间；颜色贴图使用 sRGB。
材质尺寸为 256–1024 px，山水全景为 2048 × 683 px；全部资源约 1.2 MiB。
程序纹理可用项目根目录的 `scripts/generate_li_materials.py` 重新生成，需要 Python、NumPy 和 Pillow。

山水画通过内置 imagegen 生成，最终提示词：

> Use case: stylized-concept. Asset type: transparent game material texture for existing background mountain meshes in a small Three.js classical Chinese courtyard game, NOT a scene screenshot. Primary request: one panoramic Chinese shan shui pale ink wash mountain silhouette texture. Long very wide panoramic composition, 3:1 aspect. A continuous soft distant mountain range filling lower 70 percent; top 25 percent completely transparent. Soft rounded mountain shoulders, layered low mist drifting across mid slopes, feathered diluted ink edges and subtle silk-paper brush granulation. Desaturated pale blue grey, mineral grey-green, and tiny warm rice-paper beige washes. Light delicate restrained Chinese hand-painted ink and wash, airy early morning. No hard triangular ridges or black outlines. No vivid colors. No buildings, no trees in foreground, no people, no sun, no text, no border, no watermark. All mountain ink and mist must feather smoothly into genuine transparency, especially along upper outline; bottom slightly denser wash. Very light grey/blue inks, no black. This is a standalone transparent painterly material texture and must not contain any UI, courtyard, objects or an opaque sky background.

保留现有相机、几何体、模型位置与尺寸；后期色调只处理 WebGL 画布，不处理 HTML 面板。
