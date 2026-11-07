/** Número con formato `es-ES`. */
export const fmt = (n: number) => n.toLocaleString('es-ES');
/** Fecha ISO a `DD/MM/AAAA`. */
export const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
