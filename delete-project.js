/**
 * Wires the "Delete Project" button even if it doesn't have an ID.
 * - Finds a <button> whose text is exactly "Delete Project"
 * - Asks for confirmation
 * - Clears common localStorage keys your app likely uses
 * - Empties the editor area if present
 */
export function wireDeleteProject() {
  // find the button by its label
  const deleteBtn = Array.from(document.querySelectorAll('button'))
    .find(b => (b.textContent || '').trim().toLowerCase() === 'delete project');

  if (!deleteBtn) return; // nothing to wire

  // avoid double-binding
  if (deleteBtn.dataset._wiredDelete === '1') return;
  deleteBtn.dataset._wiredDelete = '1';

  deleteBtn.addEventListener('click', () => {
    if (!confirm('Delete this project? This clears local saved data for the project.')) return;

    try {
      // Clear likely localStorage keys (adjust if you know the exact keys)
      const candidates = [
        'craftedscriptor-project',
        'craftedscriptor-projects',
        'craftedscriptor-current',
        'project',
        'projects',
        'currentProject'
      ];
      // also clear any keys that look project-related
      const heuristics = k =>
        /crafted|scriptor|project/i.test(k);

      Object.keys(localStorage).forEach(k => {
        if (candidates.includes(k) || heuristics(k)) {
          localStorage.removeItem(k);
        }
      });

      // Clear the editor content if you use a contenteditable editor
      const editor = document.getElementById('editor');
      if (editor) editor.innerHTML = '';

      alert('Project deleted from local storage.');
    } catch (e) {
      alert('Delete failed: ' + (e?.message || e));
    }
  });
}
