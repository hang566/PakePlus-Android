function openModal() {
  const modal = document.getElementById('modal');
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('modal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
});