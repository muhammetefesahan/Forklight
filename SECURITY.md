# Güvenlik

Forklight kullanıcı girdilerini bir sunucuya göndermez. Uygulama tamamen statiktir ve veriyi yalnızca aynı tarayıcı profilindeki `localStorage` alanında tutar.

## Güvenlik bildirimi

Bir güvenlik açığı bulursanız herkese açık issue içinde kullanıcı verisi, anahtar veya ayrıntılı kötüye kullanım adımları paylaşmayın. Repo sahibine GitHub'ın özel güvenlik bildirimi özelliği üzerinden ulaşın.

## Sınırlar

- Forklight bir parola kasası değildir; hassas kimlik veya finans verisi girmeyin.
- Tarayıcı profilini temizlemek yerel veriyi silebilir. Önemli çalışmalar için JSON dışa aktarımı alın.
- İçe aktarılan dosyalar 1 MB ile sınırlıdır ve tanınmayan alanlar atılır.
