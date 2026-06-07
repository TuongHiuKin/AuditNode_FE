## 2026-06-06: Dependency Graph Node Refactoring & Resizing Fix

### Context
The Dependency Manager canvas had two major UI/UX issues: custom `AppNode` components were using a pill shape that didn't align with the enterprise theme and had fixed connection points, while `ServerGroupNode` (the container) had broken manual resizing and a cluttered `NodeResizer` UI.

### Solution
1. **AppNode Visual Transition**: Redesigned as a sharp rectangle (`rounded-none`).
2. **Invisible Connect-Anywhere Handles**: Replaced visible handle dots with 8 invisible handles (4 Source, 4 Target) on all sides (Top, Bottom, Left, Right). 
3. **Handle Interactivity Fix**: Removed `pointer-events-none` from handles and stretched them into large hitboxes (`!w-full`, `!h-full`) with high z-index to allow users to click anywhere near a border to start a connection.
4. **ServerGroupNode Resizing Fix**: Correctly bound the `width` and `height` props from `@xyflow/react` to the root container's style, ensuring the node respects the resizer's dimensions.
5. **Resizer Cleanup**: Removed the blue offset border from `NodeResizer` and aligned square handles perfectly with the node's border.

### Impact
Significantly improved the visual clarity of service mappings and fixed a critical interaction bug that prevented edge connections. Also fixed a layout bug that prevented users from manually organizing server containers on the canvas.


