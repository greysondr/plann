// Foto representativa por categoría para las tarjetas de "Categorías" en
// Buscar (sección 5.3). Puramente presentacional: las categorías reales
// viven en la tabla `categories` de Supabase, esto solo es su imagen.
function img(photoId: string): string {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=900&q=70`;
}

export const categoryImages: Record<string, string> = {
  Conciertos: img("photo-1470229722913-7c0e2dbbafd3"),
  Fiestas: img("photo-1571266028243-d220c9c3b31b"),
  Tours: img("photo-1470770841072-f978cf4d019e"),
  Deportes: img("photo-1552674605-db6ffd4facb5"),
  Familia: img("photo-1524368535928-5b5e00ddc76b"),
  Teatro: img("photo-1503095396549-807759245b35"),
  Gastronomía: img("photo-1414235077428-338989a2e8c0"),
  Ferias: img("photo-1565193566173-7a0ee3dbe261"),
};
