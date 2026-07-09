<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    @click.self="emit('close')">
    <div
      class="bg-zinc-950 border border-zinc-800 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl text-zinc-100 font-sans"
      @click.stop>
      <!-- 头部 -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
        <h3 class="text-sm font-semibold tracking-wide uppercase text-zinc-300">ShaderGraph 操作手册</h3>
        <button @click="emit('close')"
          class="text-zinc-500 hover:text-zinc-300 transition-colors duration-150 text-lg cursor-pointer focus:outline-none"
          title="关闭">
          &times;
        </button>
      </div>

      <!-- 内容区 -->
      <div class="flex-1 overflow-y-auto px-6 py-4 text-xs space-y-6 scrollbar-thin">
        <!-- 基础画布操作 -->
        <section class="space-y-3">
          <h4 class="text-zinc-200 font-semibold border-l-2 border-indigo-500 pl-2.5 pb-0.5 text-[13px]">一、 基础画布操作</h4>
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-zinc-800 text-zinc-400 font-medium">
                <th class="py-1.5 w-1/3">操作方式</th>
                <th class="py-1.5">说明</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-900 text-zinc-300">
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-2.5 font-medium text-zinc-200">鼠标右键拖拽</td>
                <td class="py-2.5">按住右键拖拽可以移动视口，浏览画布上的其他节点。</td>
              </tr>
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-2.5 font-medium text-zinc-200">鼠标滚轮</td>
                <td class="py-2.5">向前或向后滚动滚轮，可以放大或缩小画布。</td>
              </tr>
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-2.5 font-medium text-zinc-200">鼠标左键拖拽框选</td>
                <td class="py-2.5">在画布空白处按住左键并拖拽，可以拉出一个选择框批量选中节点和连线。</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 常规快捷键一览 -->
        <section class="space-y-3">
          <h4 class="text-zinc-200 font-semibold border-l-2 border-indigo-500 pl-2.5 pb-0.5 text-[13px]">二、 基础快捷键一览</h4>
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-zinc-800 text-zinc-400 font-medium">
                <th class="py-1.5 w-1/3">快捷键</th>
                <th class="py-1.5">说明</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-900 text-zinc-300">
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-2.5"><kbd
                    class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400 inline-block align-middle shadow-inner">Ctrl
                    + Z</kbd></td>
                <td class="py-2.5 text-zinc-300">撤销上一步编辑操作（如误删、误连线等）。</td>
              </tr>
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-2.5"><kbd
                    class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400 inline-block align-middle shadow-inner">Ctrl
                    + Y</kbd> 或 <kbd
                    class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400 inline-block align-middle shadow-inner">Ctrl
                    + Shift + Z</kbd></td>
                <td class="py-2.5 text-zinc-300">恢复被撤销的操作。</td>
              </tr>
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-2.5"><kbd
                    class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400 inline-block align-middle shadow-inner">Shift
                    + A</kbd></td>
                <td class="py-2.5 text-zinc-300">在鼠标当前所在的位置快速弹出“节点搜索菜单”。</td>
              </tr>
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-2.5"><kbd
                    class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400 inline-block align-middle shadow-inner">Shift
                    + Tab</kbd></td>
                <td class="py-2.5 text-zinc-300">切换“网格吸附”功能（节点移动时是否对齐网格虚线）。</td>
              </tr>
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-2.5"><kbd
                    class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400 inline-block align-middle shadow-inner">Ctrl
                    + C</kbd></td>
                <td class="py-2.5 text-zinc-300">将当前选中的节点和连线复制到剪切板中。</td>
              </tr>
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-2.5"><kbd
                    class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400 inline-block align-middle shadow-inner">Ctrl
                    + V</kbd></td>
                <td class="py-2.5 text-zinc-300">将已复制的节点子图粘贴到鼠标指针当前所在的位置。</td>
              </tr>
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-2.5"><kbd
                    class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400 inline-block align-middle shadow-inner">Ctrl
                    + D</kbd></td>
                <td class="py-2.5 text-zinc-300">直接克隆一份选中的节点子图并粘贴至鼠标光标位置。</td>
              </tr>
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-2.5">
                  <kbd
                    class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400 inline-block align-middle shadow-inner">Delete</kbd>
                  或
                  <kbd
                    class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400 inline-block align-middle shadow-inner">Backspace</kbd>
                  或
                  <kbd
                    class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400 inline-block align-middle shadow-inner">X</kbd>
                </td>
                <td class="py-2.5 text-zinc-300">删除当前选中的节点与连线（最后的输出节点受保护无法删除）。</td>
              </tr>
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-2.5">
                  <kbd
                    class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400 inline-block align-middle shadow-inner">双击鼠标左键</kbd>
                </td>
                <td class="py-2.5 text-zinc-300">在画布的任意连线上双击左键，可以直接将其快速删除。</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 键盘加鼠标高效交互 -->
        <section class="space-y-3">
          <h4 class="text-zinc-200 font-semibold border-l-2 border-indigo-500 pl-2.5 pb-0.5 text-[13px]">三、 键盘 + 鼠标高效交互
          </h4>
          <div class="space-y-4">
            <div>
              <p class="font-medium text-zinc-200">1. 剪刀划线切断连线</p>
              <p class="text-zinc-400 mt-1">按住 <kbd
                  class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400">Ctrl</kbd>
                键并<strong class="text-zinc-200">按住鼠标右键在画布上拖拽</strong>，可以划出一条红色的剪切线。松开鼠标右键后，这根剪切线穿过的所有连接线都会被一次性剪断删除。</p>
            </div>

            <div>
              <p class="font-medium text-zinc-200">2. 鼠标位置一键快速创建节点</p>
              <p class="text-zinc-400 mt-1">在画布上<strong class="text-zinc-200">按住</strong>对应的快捷键（如下表所示），同时<strong class="text-zinc-200">点击鼠标左键</strong>，就会在点击的位置瞬间生成对应的节点类型，省去了频繁打开搜索菜单的步骤：</p>
              <table class="w-full text-left border-collapse mt-2.5">
                <thead>
                  <tr class="border-b border-zinc-900 text-zinc-500 font-medium">
                    <th class="py-1 w-1/4">按键 + 左击</th>
                    <th class="py-1 w-1/4">生成节点类型</th>
                    <th class="py-1 w-1/4">按键 + 左击</th>
                    <th class="py-1">生成节点类型</th>
                  </tr>
                </thead>
                <tbody class="text-zinc-300">
                  <tr class="border-b border-zinc-900/50 hover:bg-zinc-900/20 transition-colors">
                    <td class="py-2"><kbd
                        class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400">1</kbd>
                    </td>
                    <td class="py-2">浮点数 (float)</td>
                    <td class="py-2"><kbd
                        class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400">d
                        / D</kbd></td>
                    <td class="py-2">除法运算 (div)</td>
                  </tr>
                  <tr class="border-b border-zinc-900/50 hover:bg-zinc-900/20 transition-colors">
                    <td class="py-2"><kbd
                        class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400">2</kbd>
                    </td>
                    <td class="py-2">二维向量 (vec2)</td>
                    <td class="py-2"><kbd
                        class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400">t
                        / T</kbd></td>
                    <td class="py-2">纹理采样 (textureSample)</td>
                  </tr>
                  <tr class="border-b border-zinc-900/50 hover:bg-zinc-900/20 transition-colors">
                    <td class="py-2"><kbd
                        class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400">3</kbd>
                    </td>
                    <td class="py-2">三维向量 (vec3)</td>
                    <td class="py-2"><kbd
                        class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400">c
                        / C</kbd></td>
                    <td class="py-2">颜色参数 (color)</td>
                  </tr>
                  <tr class="border-b border-zinc-900/50 hover:bg-zinc-900/20 transition-colors">
                    <td class="py-2"><kbd
                        class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400">4</kbd>
                    </td>
                    <td class="py-2">四维向量 (vec4)</td>
                    <td class="py-2"><kbd
                        class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400">n
                        / N</kbd></td>
                    <td class="py-2">向量归一化 (normalize)</td>
                  </tr>
                  <tr class="border-b border-zinc-900/50 hover:bg-zinc-900/20 transition-colors">
                    <td class="py-2"><kbd
                        class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400">a
                        / A</kbd></td>
                    <td class="py-2">加法运算 (add)</td>
                    <td class="py-2"><kbd
                        class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400">u
                        / U</kbd></td>
                    <td class="py-2">UV 坐标 (uv)</td>
                  </tr>
                  <tr class="border-b border-zinc-900/50 hover:bg-zinc-900/20 transition-colors">
                    <td class="py-2"><kbd
                        class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400">s
                        / S</kbd></td>
                    <td class="py-2">减法运算 (sub)</td>
                    <td class="py-2"><kbd
                        class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400">o
                        / O</kbd></td>
                    <td class="py-2">一减运算 (oneMinus)</td>
                  </tr>
                  <tr class="hover:bg-zinc-900/20 transition-colors">
                    <td class="py-2"><kbd
                        class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400">m
                        / M</kbd></td>
                    <td class="py-2">线性插值 (mix)</td>
                    <td class="py-2"></td>
                    <td class="py-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- 智能连线与插槽交互 -->
        <section class="space-y-3">
          <h4 class="text-zinc-200 font-semibold border-l-2 border-indigo-500 pl-2.5 pb-0.5 text-[13px]">四、 智能连线与插槽交互
          </h4>
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-zinc-800 text-zinc-400 font-medium">
                <th class="py-1.5 w-1/3">交互功能</th>
                <th class="py-1.5">说明与操作方法</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-900 text-zinc-300">
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-3 font-medium text-indigo-400">自动连接吸附</td>
                <td class="py-3">当你拉起一根连线靠近可匹配的目标插槽（50 像素范围内）时，连接线会自动吸附变成虚线高亮。此时直接松开鼠标，即可快速完成连线。</td>
              </tr>
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-3 font-medium text-indigo-400">节点快速插入连线</td>
                <td class="py-3">当你拖拽一个有空闲插槽的节点，划过画布上某条已经连好的线时，该连线会变成淡虚线高亮。此时松开鼠标，该节点就会自动“夹”在原有的两端节点中间完成重连。</td>
              </tr>
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-3 font-medium text-indigo-400">直接替换已有连接</td>
                <td class="py-3">节点的输入插槽只允许接一根线。当拉起一根新线直接插入一个已经有线的输入端时，系统会自动断开并清除旧连线，连上新线，不需要手动先去删除旧连线。</td>
              </tr>

            </tbody>
          </table>
        </section>

        <!-- 节点高级快捷重构命令 -->
        <section class="space-y-3">
          <h4 class="text-zinc-200 font-semibold border-l-2 border-indigo-500 pl-2.5 pb-0.5 text-[13px]">五、 节点高级重构按键命令
          </h4>
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-zinc-800 text-zinc-400 font-medium">
                <th class="py-1.5 w-1/3">快捷键</th>
                <th class="py-1.5">作用与说明</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-900 text-zinc-300">
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-3.5"><kbd
                    class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400 inline-block align-middle shadow-inner">Alt
                    + X</kbd></td>
                <td class="py-3.5">
                  <span class="font-semibold text-zinc-200 block mb-0.5">跳过并删除所选节点 (Bypass and Remove)</span>
                  删除选中节点的同时，自动将原先连在它左端和右端的线“接”起来（即直接桥接前驱节点和后继节点），确保信号流不会因为删除节点而中断。
                </td>
              </tr>
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-3.5"><kbd
                    class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400 inline-block align-middle shadow-inner">Alt
                    + B</kbd></td>
                <td class="py-3.5">
                  <span class="font-semibold text-zinc-200 block mb-0.5">拔出所选节点 (Detach)</span>
                  将选中节点从已有的网络连线中“拔”出来（断开和它的所有连线，同时自动重新接通它原先的前后级连线），节点本身依然完好地保留在画布上。
                </td>
              </tr>
              <tr class="hover:bg-zinc-900/30 transition-colors">
                <td class="py-3.5"><kbd
                    class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-indigo-400 inline-block align-middle shadow-inner">Alt
                    + S</kbd></td>
                <td class="py-3.5">
                  <span class="font-semibold text-zinc-200 block mb-0.5">快捷对调/交换连线 (Swap)</span>
                  若<strong class="text-zinc-200">仅选中 1 个</strong>节点：自动对调它的前两个输入连线（比如快速调换加法的 A 和 B 输入线）。
                  <br>若<strong class="text-zinc-200">同时选中 2 个</strong>节点：互换这两个节点后面的所有输出连线（同时根据插槽列表对齐映射）。
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['close'])
</script>

<style scoped>
/* 滚动条极简优化 */
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 2px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}
</style>
