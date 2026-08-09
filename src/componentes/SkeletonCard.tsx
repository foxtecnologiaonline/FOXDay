// Skeleton loader para card (histórico, relatório, etc)
export default function SkeletonCard() {
  return (
    <div className="cartao item-historico skeleton">
      <div className="skeleton-barra-grande" />
      <div className="skeleton-barra-pequena" style={{ marginTop: '12px' }} />
    </div>
  )
}
