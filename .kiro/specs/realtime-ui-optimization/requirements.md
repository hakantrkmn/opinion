# Requirements Document

## Introduction

Bu özellik, mevcut pin tabanlı harita uygulamasında kullanıcı deneyimini iyileştirmek için gerçek zamanlı UI güncellemeleri ve gelişmiş cache yönetimi sağlar. Kullanıcılar yorum ekleme, like/dislike işlemleri sırasında loading ekranları görmeden anında görsel geri bildirim alacaklar. Ayrıca cache sistemi daha tutarlı ve performanslı hale getirilecektir.

## Requirements

### Requirement 1

**User Story:** Kullanıcı olarak, bir pin'e yorum eklediğimde, loading ekranı görmeden yorumun hemen ekranda görünmesini istiyorum, böylece akıcı bir deneyim yaşayabilirim.

#### Acceptance Criteria

1. WHEN kullanıcı yorum gönder butonuna bastığında THEN sistem yorumu anında UI'da göstermeli
2. WHEN yorum başarıyla kaydedildiğinde THEN sistem gerçek yorum ID'sini güncellemelidir
3. IF yorum kaydedilemezse THEN sistem yorumu UI'dan kaldırmalı ve hata mesajı göstermelidir
4. WHEN yorum eklendikten sonra THEN input alanı temizlenmeli ve focus korunmalıdır

### Requirement 2

**User Story:** Kullanıcı olarak, like/dislike butonlarına bastığımda anında sayıların değişmesini istiyorum, böylece işlemin gerçekleştiğini hemen görebilirim.

#### Acceptance Criteria

1. WHEN kullanıcı like butonuna bastığında THEN like sayısı anında artmalıdır
2. WHEN kullanıcı dislike butonuna bastığında THEN dislike sayısı anında artmalıdır
3. WHEN kullanıcı aynı butona tekrar bastığında THEN vote kaldırılmalı ve sayı azalmalıdır
4. WHEN kullanıcı farklı vote butonuna bastığında THEN önceki vote kaldırılıp yeni vote eklenmelidir
5. IF vote işlemi başarısız olursa THEN UI eski haline geri dönmelidir

### Requirement 3

**User Story:** Kullanıcı olarak, cache sisteminin tutarlı çalışmasını istiyorum, böylece aynı verileri tekrar tekrar yüklemek zorunda kalmam.

#### Acceptance Criteria

1. WHEN harita aynı bölgeye tekrar odaklandığında THEN cache'den veri yüklenmelidir
2. WHEN yeni pin eklediğimde THEN ilgili cache alanları güncellenmelidir
3. WHEN yorum eklediğimde THEN pin'in yorum sayısı cache'de güncellenmelidir
4. WHEN cache süresi dolduğunda THEN otomatik olarak yeni veri çekilmelidir
5. WHEN kullanıcı refresh butonuna bastığında THEN cache temizlenip yeni veri çekilmelidir

### Requirement 4

**User Story:** Kullanıcı olarak, optimistic update'ler başarısız olduğunda net geri bildirim almak istiyorum, böylece ne olduğunu anlayabilirim.

#### Acceptance Criteria

1. WHEN optimistic update başarısız olduğunda THEN kullanıcıya toast/snackbar ile bilgi verilmelidir
2. WHEN network hatası oluştuğunda THEN retry seçeneği sunulmalıdır
3. WHEN geçici yorum ID'si varken vote yapılmaya çalışıldığında THEN kullanıcı bilgilendirilmelidir
4. IF sürekli hata oluşuyorsa THEN kullanıcıya genel hata mesajı gösterilmelidir

### Requirement 5

**User Story:** Pin sahibi olarak, pin'imdeki son yorumu sildiğimde pin'in otomatik olarak silinmesini istiyorum, böylece boş pin'ler haritada kalmasın.

#### Acceptance Criteria

1. WHEN pin sahibi son yorumu sildiğinde THEN pin otomatik olarak silinmelidir
2. WHEN pin silindiğinde THEN veritabanından da tamamen kaldırılmalıdır
3. WHEN pin silindiğinde THEN harita üzerinden anında kaldırılmalıdır
4. WHEN pin silindiğinde THEN cache'den de temizlenmelidir
5. IF pin'de başka yorumlar varsa THEN sadece yorum silinmeli, pin korunmalıdır

### Requirement 6

**User Story:** Kullanıcı olarak, pin'deki yorumları farklı kriterlere göre sıralayabilmek istiyorum, böylece en ilginç yorumları kolayca bulabilirim.

#### Acceptance Criteria

1. WHEN yorum listesinde sıralama seçeneği seçildiğinde THEN yorumlar o kritere göre sıralanmalıdır
2. WHEN "En Çok Beğenilen" seçildiğinde THEN yorumlar like sayısına göre azalan sırada gösterilmelidir
3. WHEN "En Yeni" seçildiğinde THEN yorumlar tarihe göre azalan sırada gösterilmelidir
4. WHEN "En Eski" seçildiğinde THEN yorumlar tarihe göre artan sırada gösterilmelidir
5. WHEN like/dislike sayıları gösterildiğinde THEN net skor (like - dislike) da görünmelidir
6. WHEN sıralama değiştirildiğinde THEN mevcut yorumlar yeniden sıralanmalı, yeni fetch gerekmemelidir

### Requirement 7

**User Story:** Geliştirici olarak, cache ve state yönetiminin merkezi ve tutarlı olmasını istiyorum, böylece kod bakımı kolay olsun.

#### Acceptance Criteria

1. WHEN cache işlemleri yapıldığında THEN merkezi cache manager kullanılmalıdır
2. WHEN state güncellemeleri yapıldığında THEN immutable pattern kullanılmalıdır
3. WHEN optimistic update'ler yapıldığında THEN rollback mekanizması bulunmalıdır
4. WHEN cache invalidation gerektiğinde THEN ilgili tüm alanlar temizlenmelidir
