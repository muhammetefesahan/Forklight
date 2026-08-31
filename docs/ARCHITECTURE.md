# Mimari

Forklight derleme gerektirmeyen statik bir web uygulamasıdır.

## Katmanlar

- `src/core.js`: veri normalizasyonu, sınırlar, skorlar ve Markdown üretimi. DOM veya depolama bağımlılığı yoktur.
- `src/app.js`: form olayları, `localStorage`, içe/dışa aktarma, erişilebilir bildirimler ve service worker kaydı.
- `src/styles.css`: koyu editoryal tasarım, üç yol renk sistemi ve responsive yerleşim.
- `sw.js`: yalnızca aynı kaynaktaki uygulama kabuğunu çevrimdışı önbelleğe alır.

## Güven sınırları

İçe aktarılan JSON doğrudan kullanılmaz; `normalizeProject` yalnızca bilinen alanları alır, metin uzunluklarını ve sayısal aralıkları sınırlar. Kullanıcı metni `innerHTML` ile yazdırılmaz. CSP dış bağlantıları engeller.

## Veri yaşam döngüsü

Form → normalize edilmiş bellek durumu → `localStorage` → kullanıcı isterse JSON/Markdown dosyası. Sunucu veya üçüncü taraf bulunmaz.
