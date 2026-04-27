import * as THREE from 'three';

/**
 * Handles mouse and touch drag-to-rotate interaction on the pivot group.
 * Supports spacebar + drag for panning.
 */
export class DragHandler {
  /**
   * @param {HTMLElement} container — the element to listen on
   * @param {THREE.Group} pivot — the group to rotate
   * @param {THREE.Camera} camera — used for raycasting
   * @param {function} onRotation — called after each drag move
   * @param {function} [onPan] — called with (dx, dy) pixel deltas during pan
   */
  constructor(container, pivot, camera, onRotation, onPan) {
    this._container = container;
    this._pivot = pivot;
    this._camera = camera;
    this._onRotation = onRotation;
    this._onPan = onPan || null;

    this._dragActive = false;
    this._panActive = false;
    this._spaceDown = false;
    this._lastPointer = { x: 0, y: 0 };

    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();

    const setNDC = (cx, cy) => {
      pointerNDC.x = (cx / innerWidth) * 2 - 1;
      pointerNDC.y = -(cy / innerHeight) * 2 + 1;
    };

    const pick = (cx, cy) => {
      setNDC(cx, cy);
      raycaster.setFromCamera(pointerNDC, this._camera);
      return raycaster.intersectObject(this._pivot, true).length > 0;
    };

    const onDown = (cx, cy) => {
      // spacebar held → start pan (no raycasting needed)
      if (this._spaceDown && this._onPan) {
        this._panActive = true;
        this._lastPointer.x = cx;
        this._lastPointer.y = cy;
        this._container.style.cursor = 'grabbing';
        return;
      }
      if (pick(cx, cy)) {
        this._dragActive = true;
        this._lastPointer.x = cx;
        this._lastPointer.y = cy;
      }
    };

    const onMove = (cx, cy) => {
      if (this._panActive) {
        const dx = cx - this._lastPointer.x;
        const dy = cy - this._lastPointer.y;
        this._lastPointer.x = cx;
        this._lastPointer.y = cy;
        this._onPan(dx, dy);
        return;
      }
      if (!this._dragActive) return;
      const dx = cx - this._lastPointer.x;
      const dy = cy - this._lastPointer.y;
      this._lastPointer.x = cx;
      this._lastPointer.y = cy;
      const speed = 0.008;
      this._pivot.rotation.y += dx * speed;
      this._pivot.rotation.x += dy * speed;
      this._onRotation();
    };

    const onUp = () => {
      this._dragActive = false;
      if (this._panActive) {
        this._panActive = false;
        this._container.style.cursor = this._spaceDown ? 'grab' : '';
      }
    };

    // spacebar tracking
    this._boundKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        this._spaceDown = true;
        this._container.style.cursor = 'grab';
      }
    };
    this._boundKeyUp = (e) => {
      if (e.code === 'Space') {
        this._spaceDown = false;
        this._container.style.cursor = '';
        if (this._panActive) {
          this._panActive = false;
        }
      }
    };
    addEventListener('keydown', this._boundKeyDown);
    addEventListener('keyup', this._boundKeyUp);

    // mouse
    this._boundMouseDown = (e) => { if (e.button === 0) onDown(e.clientX, e.clientY); };
    this._boundMouseMove = (e) => onMove(e.clientX, e.clientY);
    this._boundMouseUp   = onUp;
    container.addEventListener('mousedown', this._boundMouseDown);
    addEventListener('mousemove', this._boundMouseMove);
    addEventListener('mouseup', this._boundMouseUp);

    // touch
    this._boundTouchStart = (e) => {
      if (e.touches.length === 1) onDown(e.touches[0].clientX, e.touches[0].clientY);
    };
    this._boundTouchMove = (e) => {
      if (e.touches.length === 1) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      }
    };
    this._boundTouchEnd = onUp;
    container.addEventListener('touchstart', this._boundTouchStart, { passive: true });
    container.addEventListener('touchmove', this._boundTouchMove, { passive: false });
    container.addEventListener('touchend', this._boundTouchEnd);
    container.addEventListener('touchcancel', this._boundTouchEnd);
  }

  dispose() {
    removeEventListener('keydown', this._boundKeyDown);
    removeEventListener('keyup', this._boundKeyUp);
    this._container.removeEventListener('mousedown', this._boundMouseDown);
    removeEventListener('mousemove', this._boundMouseMove);
    removeEventListener('mouseup', this._boundMouseUp);
    this._container.removeEventListener('touchstart', this._boundTouchStart);
    this._container.removeEventListener('touchmove', this._boundTouchMove);
    this._container.removeEventListener('touchend', this._boundTouchEnd);
    this._container.removeEventListener('touchcancel', this._boundTouchEnd);
    this._container.style.cursor = '';
  }
}
