/**
 * TJK Editör Paneli · giriş kaydı
 * Google E-Tablo → Uzantılar → Apps Script → bu kodu yapıştırın → Dağıt → Yeni dağıtım → Web uygulaması
 * (Yürütme: Ben · Erişimi olan: Herkes). Çıkan "Web uygulaması URL'si"ni siteye ekletin.
 */
function doPost(e) {
  var sayfa = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sayfa.getLastRow() === 0) {
    sayfa.appendRow(['Zaman', 'Kullanıcı', 'Olay', 'Sekme', 'Cihaz', 'Tarayıcı']);
    sayfa.getRange(1, 1, 1, 6).setFontWeight('bold');
    sayfa.setFrozenRows(1);
  }
  var d = {};
  try { d = JSON.parse(e.postData.contents); } catch (hata) { return ContentService.createTextOutput('hatalı'); }
  var kirp = function (x) { return String(x || '').slice(0, 60); };
  sayfa.appendRow([new Date(), kirp(d.k), kirp(d.o), kirp(d.s), kirp(d.c), kirp(d.t)]);
  return ContentService.createTextOutput('ok');
}
