import * as THREE from 'three';

/**
 * Handles hover-highlight and click detection on spike tetrahedra.
 *
 * - Hover: spike faces turn highlighted blue
 * - Click: logs "click" to console
 */
export class SpikeInteraction {
  /**
   * @param {HTMLElement} container — element to listen on
   * @param {THREE.Group} pivot — group containing spike meshes
   * @param {THREE.Camera} camera — used for raycasting
   */
  constructor(container, pivot, camera) {
    this._container = container;
    this._pivot = pivot;
    this._camera = camera;

    this._raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();

    this._hoveredMesh = null;
    this._originalColor = null;
    this._highlightColor = new THREE.Color(0x4a90ff);

    this._downX = 0;
    this._downY = 0;

    this._boundMouseMove = (e) => this._onMouseMove(e);
    this._boundMouseDown = (e) => this._onMouseDown(e);
    this._boundMouseUp = (e) => this._onMouseUp(e);

    container.addEventListener('mousemove', this._boundMouseMove);
    container.addEventListener('mousedown', this._boundMouseDown);
    container.addEventListener('mouseup', this._boundMouseUp);
  }

  _setNDC(cx, cy) {
    this._pointer.x = (cx / innerWidth) * 2 - 1;
    this._pointer.y = -(cy / innerHeight) * 2 + 1;
  }

  _pickSpike(cx, cy) {
    this._setNDC(cx, cy);
    this._raycaster.setFromCamera(this._pointer, this._camera);
    const hits = this._raycaster.intersectObject(this._pivot, true);
    for (const hit of hits) {
      if (hit.object.isMesh && hit.object.userData.facetSide) {
        return hit.object;
      }
    }
    return null;
  }

  _onMouseMove(e) {
    const mesh = this._pickSpike(e.clientX, e.clientY);

    if (mesh === this._hoveredMesh) return;

    // restore previous
    if (this._hoveredMesh && this._originalColor) {
      this._hoveredMesh.material.color.copy(this._originalColor);
      this._hoveredMesh.material.emissive.setHex(0x000000);
    }

    if (mesh) {
      this._hoveredMesh = mesh;
      this._originalColor = mesh.material.color.clone();
      mesh.material.color.copy(this._highlightColor);
      mesh.material.emissive.copy(this._highlightColor);
      mesh.material.emissive.multiplyScalar(0.3);
      this._container.style.cursor = 'pointer';
    } else {
      this._hoveredMesh = null;
      this._originalColor = null;
      this._container.style.cursor = '';
    }
  }

  _onMouseDown(e) {
    if (e.button === 0) {
      this._downX = e.clientX;
      this._downY = e.clientY;
    }
  }

  _onMouseUp(e) {
    if (e.button !== 0) return;
    // only count as click if mouse didn't move much (not a drag)
    if (Math.abs(e.clientX - this._downX) + Math.abs(e.clientY - this._downY) > 6) return;

    const mesh = this._pickSpike(e.clientX, e.clientY);
    if (mesh) {
      console.log('click');
    }
  }

  dispose() {
    // restore color if still hovering
    if (this._hoveredMesh && this._originalColor) {
      this._hoveredMesh.material.color.copy(this._originalColor);
      this._hoveredMesh.material.emissive.setHex(0x000000);
    }
    this._container.removeEventListener('mousemove', this._boundMouseMove);
    this._container.removeEventListener('mousedown', this._boundMouseDown);
    this._container.removeEventListener('mouseup', this._boundMouseUp);
    this._container.style.cursor = '';
  }
}
