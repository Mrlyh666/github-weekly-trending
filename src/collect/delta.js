// Append `starsGained` to each current project: current stars minus the same
// repo's stars from the previous snapshot. A repo absent from the previous
// snapshot (first appearance, or a missing prior week) gets null.
export function computeStarsGained(prevProjects, currentProjects) {
  const prev = new Map((prevProjects ?? []).map((p) => [p.repo, p.stars]));
  return currentProjects.map((p) => ({
    ...p,
    starsGained: prev.has(p.repo) ? p.stars - prev.get(p.repo) : null,
  }));
}