/*Copyright (C) Crawford Currie 2026 - All rights reserved*/

/**
 * Very simple modal CSS popups.
 * ```
 * <div id="modalId" class="modal-overlay">
 *   <div class="modal">
 *   </div>
 * </div>
 * ```
 * Javascript
 * ```
 * const modal = new Modal("modalId").open();
 * modal.close();
 * ```
 */
class Modal {
  /***
   * @param {HTMLElement|string} dlg div element or id
   */
  constructor(div) {
    if (typeof div === "string")
    div = document.getElementById(div);
    this.div = div;
  }

  /**
   * Open the modal
   */
  open() {
    this.div.classList.add("active");
    return this;
  }

  /**
   * Close the modal
   */
  close() {
    this.div.classList.remove("active");
    return this;
  }
}

document.querySelectorAll(".modal-close")
.forEach(button => button.addEventListener("click", function() {
  const dlg = this.closest(".modal-overlay");
  new Modal(dlg).close();
}));

export default Modal;
