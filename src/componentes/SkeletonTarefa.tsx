// Skeleton loader para tarefa (matching layout de Tarefa real)
export default function SkeletonTarefa() {
  return (
    <li className="item-tarefa skeleton">
      <input type="checkbox" disabled className="skeleton-checkbox" />
      <div className="skeleton-titulo" />
      <div className="skeleton-label" />
    </li>
  )
}
