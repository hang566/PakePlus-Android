/**
 * ============================================================
 * modal.js - 模态框组件功能
 * 
 * 定义模态框的打开和关闭功能
 * ============================================================ */

/**
 * 打开模态框
 * @param {string} [id='modal'] - 模态框元素的 id，默认为 'modal'
 */
function openModal(id) {
  const modalId = id || 'modal';
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
  }
}

/**
 * 关闭模态框
 * @param {string} [id='modal'] - 模态框元素的 id，默认为 'modal'
 */
function closeModal(id) {
  const modalId = id || 'modal';
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}
