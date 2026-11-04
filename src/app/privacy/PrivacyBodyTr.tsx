/** Turkish privacy policy text. Keep in sync with PrivacyBodyEn. */
export function PrivacyBodyTr({ contactEmail: CONTACT_EMAIL }: { contactEmail: string }) {
  return (
    <>
      <section className="flex flex-col gap-3">
        <p>
          droPINion (&quot;biz&quot;) konum tabanlı bir sosyal haritadır. Bu
          Gizlilik Politikası hangi bilgileri topladığımızı, bunları nasıl
          kullandığımızı ve senin hangi seçeneklere sahip olduğunu anlatır.
          droPINion mobil uygulaması ve droPINion web sitesi için geçerlidir.
        </p>
        <p>
          Bir hesap oluşturarak ya da uygulamayı kullanarak bu Politikayı
          kabul etmiş olursun. Kabul etmiyorsan lütfen hizmeti kullanma.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>1. Topladığımız Bilgiler</h2>

        <h3>Senin verdiğin bilgiler</h3>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>
            <strong>Hesap:</strong> e-posta adresin ve şifren (şifreler
            hash&apos;lenerek saklanır; şifrenin açık hâlini asla görmeyiz).
          </li>
          <li>
            <strong>Profil:</strong> görünen adın ve isteğe bağlı profil
            fotoğrafın.
          </li>
          <li>
            <strong>Kullanıcı içeriği:</strong> pinler (bir pin; bir ad, kesin
            bir coğrafi koordinat, isteğe bağlı bir fotoğraf ve bir yorumdan
            oluşur), başka pinlere yazdığın yorumlar ve yorumlara verdiğin
            oylar (beğeni / beğenmeme).
          </li>
          <li>
            <strong>Fotoğraflar:</strong> bir pine ya da yoruma eklemeyi
            seçtiğin görseller.
          </li>
        </ul>

        <h3>Otomatik olarak toplanan bilgiler</h3>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>
            <strong>Konum:</strong> bir pin oluşturduğunda ya da haritayı
            bulunduğun yere ortaladığında uygulama cihazının GPS
            koordinatlarını okur. Bir yorumda “Buradayım”a dokunduğunda
            konumun pinle bir kez karşılaştırılır; yalnızca ortaya çıkan
            “Buradaydı” rozeti kaydedilir, koordinatlar asla kaydedilmez.
            Konumunu arka planda takip etmeyiz. Konum iznini cihaz
            ayarlarından istediğin zaman reddedebilir ya da geri alabilirsin;
            uygulama yine de herkese açık haritada gezinmene izin verir.
          </li>
          <li>
            <strong>Anlık bildirim jetonu:</strong> bildirimleri açarsan,
            sana ilgili uyarıları gönderebilmemiz için (ör. biri yorumunu
            beğendiğinde) cihazının bildirim jetonu saklanır.
          </li>
          <li>
            <strong>Teknik veriler:</strong> IP adresi ve tarayıcı/cihaz
            bilgisi (user-agent). Bunlar istek sınırlama, kötüye kullanımı
            önleme ve yönetici denetim kayıtları için kullanılır. Bunları
            takip ya da reklam için kullanmayız.
          </li>
        </ul>

        <h3>
          <em>Toplamadığımız</em> bilgiler
        </h3>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>Rehber, takvim ya da mikrofon verilerini toplamayız.</li>
          <li>
            Uygulamada üçüncü taraf analiz ya da reklam SDK&apos;ları
            çalıştırmayız.
          </li>
          <li>
            Kişisel verilerini satmayız ve bağlamlar arası davranışsal reklam
            amacıyla kimseyle paylaşmayız.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2>2. Bilgilerini Nasıl Kullanıyoruz</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>Hesabını oluşturmak ve kimliğini doğrulamak için.</li>
          <li>
            Pinlerini, yorumlarını ve oylarını, seçtiğin koordinatta diğer
            kullanıcılara göstermek için.
          </li>
          <li>Almayı kabul ettiğin anlık bildirimleri iletmek için.</li>
          <li>
            Hizmeti denetlemek için: şikayetleri incelemek, kötü niyetli
            kullanıcıları engellemek ve kurallarımızı ihlal eden içerikleri
            kaldırmak.
          </li>
          <li>
            Dolandırıcılığı ve kötüye kullanımı önlemek için (istek sınırlama,
            denetim kayıtları).
          </li>
          <li>Yasal yükümlülüklerimizi yerine getirmek için.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2>3. Herkese Açık İçerik</h2>
        <p>
          Pinler, yorumlar, oylar ve herkese açık profilin (görünen ad, profil
          fotoğrafı) droPINion&apos;u kullanan herkes tarafından görülebilir;
          giriş yapmamış kullanıcılar da buna dahildir (herkese açık harita
          hesapsız gezilebilir). Herkese açık olmasını istemeyeceğin hiçbir
          şeyi paylaşma.
        </p>
        <p>
          E-posta adresin ve cihazının o anki kesin GPS koordinatı (yayınlamayı
          seçtiğin bir pin koordinatından farklı olarak) diğer kullanıcılara{" "}
          <strong>asla</strong> gösterilmez.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>4. Üçüncü Taraf Hizmetler</h2>
        <p>
          Hizmeti çalıştırmak için az sayıda güvenilir sağlayıcı kullanıyoruz.
          Her biri yalnızca ihtiyaç duyduğu veriyi alır:
        </p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>
            <strong>Apple Push Notification Service / Firebase Cloud
            Messaging:</strong> anlık bildirimleri iletmek için. Cihazının
            bildirim jetonu sağlayıcıda saklanır.
          </li>
          <li>
            <strong>Google Maps SDK:</strong> Android&apos;de harita yüzeyini
            çizer. Google&apos;ın gizlilik koşullarına tabidir.
          </li>
          <li>
            <strong>Resend:</strong> işlem e-postalarını gönderir (kayıt
            onayı, şifre sıfırlama). E-posta adresini ve e-postanın içeriğini
            alır.
          </li>
          <li>
            <strong>Barındırma / veritabanı:</strong> sunucularımız ve
            Postgres veritabanımız yukarıda anlatılan verileri saklar. Bunlar,
            standart veri işleme koşullarıyla altyapı sağlayıcılarında
            çalışır.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2>5. Kullanıcı İçeriği ve Denetim</h2>
        <p>
          droPINion uygunsuz içeriğe ve kötü niyetli davranışa sıfır tolerans
          gösterir. Uygulamanın içinden erişebileceğin şu araçları sunuyoruz:
        </p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>
            <strong>Şikayet et:</strong> her pin, yorum ya da kullanıcı
            &quot;…&quot; menüsünden şikayet edilebilir; spam, taciz ve
            uygunsuz içerik gibi nedenler seçilebilir.
          </li>
          <li>
            <strong>Engelle:</strong> her kullanıcıyı profilinden
            engelleyebilirsin. Engellediğin kullanıcının pinleri ve yorumları
            sana, seninkiler de ona görünmez olur.
          </li>
          <li>
            <strong>Sil:</strong> kendi pinlerini, yorumlarını ve yüklediğin
            fotoğrafları istediğin zaman silebilirsin.
          </li>
        </ul>
        <p>
          Her şikayeti <strong>24 saat</strong> içinde inceleyip gereğini
          yapmayı (içeriği kaldırmak, kullanıcıyı askıya almak ya da şikayeti
          reddetmek) taahhüt ediyoruz. Kurallarımızı tekrar tekrar ihlal eden
          kullanıcıların hesapları kaldırılır.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>6. Verilerin Saklanması</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>Hesap verileri, hesabın aktif olduğu sürece saklanır.</li>
          <li>
            Hesabını sildiğinde profilini, pinlerini, yorumlarını, oylarını,
            fotoğraflarını ve bildirim jetonlarını sileriz. Bu işlem geri
            alınamaz.
          </li>
          <li>
            Sunucu kayıtları (IP, user-agent, denetim kaydı) güvenlik ve
            kötüye kullanımı önleme amacıyla en fazla 90 gün saklanır, sonra
            silinir.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2>7. Hakların</h2>
        <p>
          Yaşadığın yere bağlı olarak (ör. Türkiye&apos;de KVKK, AB/Birleşik
          Krallık&apos;ta GDPR, Kaliforniya&apos;da CCPA kapsamında) şu
          haklara sahip olabilirsin:
        </p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>Hakkında tuttuğumuz kişisel verilere erişmek.</li>
          <li>Yanlış verileri düzeltmek (profilini uygulamadan düzenleyebilirsin).</li>
          <li>Verilerini silmek (hesabını uygulamadan silebilirsin).</li>
          <li>Verilerinin bir kopyasını almak.</li>
          <li>Veri işleme için verdiğin onayı geri çekmek.</li>
          <li>Veri işlemeye itiraz etmek ya da yerel veri koruma otoritesine şikayette bulunmak.</li>
        </ul>
        <p>
          Bu haklardan herhangi birini kullanmak için bize{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="break-words"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          adresinden yaz. 30 gün içinde yanıt veririz.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>8. Çocuklar</h2>
        <p>
          droPINion 13 yaşından küçük çocuklar (geçerli olduğu yerlerde,
          AEA&apos;da 16 yaşından küçükler) için tasarlanmamıştır. Bu yaştaki
          çocuklardan bilerek veri toplamayız. Bir çocuğun kayıt olduğunu
          düşünüyorsan{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="break-words"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          adresine e-posta gönder, hesabı kaldıralım.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>9. Güvenlik</h2>
        <p>
          Aktarım sırasında TLS, hash&apos;lenmiş şifreler (better-auth),
          kısıtlı yönetici erişimi ve veritabanı düzeyinde erişim denetimleri
          kullanıyoruz. Hiçbir sistem kusursuz güvenli değildir; verilerini
          etkileyen bir ihlal yaşarsak yürürlükteki yasaların gerektirdiği
          şekilde seni bilgilendiririz.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>10. Uluslararası Aktarımlar</h2>
        <p>
          Altyapımız verileri yaşadığın ülke dışındaki ülkelerde saklayabilir
          ve işleyebilir. Gerektiğinde standart sözleşme maddelerine ya da
          eşdeğer güvencelere dayanırız.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>11. Bu Politikadaki Değişiklikler</h2>
        <p>
          Bu Politikayı güncelleyebiliriz. Önemli değişiklikler uygulamada
          öne çıkarılır ve yukarıdaki &quot;Son güncelleme&quot; tarihi
          değişir. Bir değişiklikten sonra droPINion&apos;u kullanmaya devam
          etmen, güncellenmiş Politikayı kabul ettiğin anlamına gelir.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>12. İletişim</h2>
        <p>
          Sorun, talebin ya da şikayetin mi var? Bize{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="break-words"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          adresinden yaz.
        </p>
      </section>
    </>
  );
}
