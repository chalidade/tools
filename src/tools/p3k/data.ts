/*
 * First-aid cards. Text follows the general guidance of PMI (Palang Merah
 * Indonesia) and WHO / Red Cross first-aid guidelines. Keep sources and the
 * review date here so they can be updated in one place.
 */
export const P3K_SOURCES = 'PMI (Palang Merah Indonesia), WHO, International Federation of Red Cross and Red Crescent Societies — First Aid Guidelines'
export const P3K_CHECKED = '2026-11'

export type P3kIcon = 'choke' | 'burn' | 'bleed' | 'faint' | 'seizure' | 'snake' | 'fracture'

export interface P3kCard {
  id: string
  icon: P3kIcon
  title: [string, string]
  /** Call 112/119 straight away? */
  urgent: boolean
  /** Steps as [id, en] pairs. */
  steps: [string, string][]
  /** Things not to do as [id, en] pairs. */
  avoid: [string, string][]
}

export const P3K_CARDS: P3kCard[] = [
  {
    id: 'tersedak',
    icon: 'choke',
    title: ['Tersedak', 'Choking'],
    urgent: true,
    steps: [
      ['Tanya "Anda tersedak?". Bila masih bisa batuk atau bicara, minta terus batuk dan jangan ditepuk.', 'Ask "Are you choking?". If they can still cough or speak, encourage coughing and do not hit their back.'],
      ['Bila tidak bisa bicara, batuk, atau bernapas: suruh orang lain menelepon 112/119.', 'If they cannot speak, cough or breathe: have someone call 112/119.'],
      ['Dewasa/anak: berdiri di belakang, lingkarkan lengan, kepalkan satu tangan di atas pusar (di bawah tulang dada), tarik cepat ke arah perut dan ke atas (Heimlich). Ulangi sampai benda keluar.', 'Adult/child: stand behind, wrap your arms around, place a fist above the navel (below the breastbone) and pull sharply inwards and upwards (Heimlich). Repeat until the object comes out.'],
      ['Bayi (di bawah 1 tahun): telungkupkan di lengan dengan kepala lebih rendah dan tahan rahang. Beri 5 tepukan di punggung (antara tulang belikat), lalu telentangkan dan beri 5 tekanan dengan dua jari di tengah dada. Ulangi bergantian. Jangan Heimlich pada bayi.', 'Infant (under 1): lay face down along your forearm, head lower than the body, supporting the jaw. Give 5 back blows between the shoulder blades, then turn them over and give 5 chest thrusts with two fingers on the centre of the chest. Alternate. No abdominal thrusts for infants.'],
      ['Bila korban pingsan dan tidak bernapas, baringkan dan mulai CPR.', 'If they collapse and stop breathing, lay them down and start CPR.'],
    ],
    avoid: [
      ['Jangan memasukkan jari ke mulut secara membabi buta.', 'Do not sweep blindly with a finger in the mouth.'],
      ['Jangan memberi minum.', 'Do not give drinks.'],
    ],
  },
  {
    id: 'luka-bakar',
    icon: 'burn',
    title: ['Luka bakar', 'Burns'],
    urgent: false,
    steps: [
      ['Jauhkan dari sumber panas. Lepas perhiasan/pakaian di sekitar luka sebelum bengkak, kecuali menempel di kulit.', 'Move away from the heat. Remove jewellery and clothing near the burn before it swells, unless stuck to the skin.'],
      ['Alirkan air mengalir (suhu ruang, bukan es) di luka selama 20 menit.', 'Cool with running water (room temperature, not ice) for 20 minutes.'],
      ['Tutup longgar dengan kain bersih tidak berbulu atau plastik pembungkus makanan.', 'Cover loosely with a clean non-fluffy cloth or cling film.'],
      ['Telepon 112/119 atau ke IGD bila lukanya luas, dalam, di wajah/tangan/kelamin/sendi, karena listrik atau bahan kimia, atau korbannya anak/lansia.', 'Call 112/119 or go to the ER if the burn is large, deep, on the face/hands/genitals/joints, caused by electricity or chemicals, or the person is a child or elderly.'],
    ],
    avoid: [
      ['Jangan oleskan odol, mentega, minyak, atau es.', 'Do not apply toothpaste, butter, oil or ice.'],
      ['Jangan pecahkan lepuh.', 'Do not pop blisters.'],
    ],
  },
  {
    id: 'pendarahan',
    icon: 'bleed',
    title: ['Pendarahan', 'Bleeding'],
    urgent: true,
    steps: [
      ['Pakai sarung tangan atau plastik bila ada. Tekan langsung luka dengan kain bersih/kasa dan tahan kuat tanpa dilepas.', 'Use gloves or a plastic bag if available. Press firmly on the wound with a clean cloth or gauze and hold without lifting.'],
      ['Tinggikan bagian yang terluka bila tidak ada dugaan patah tulang.', 'Raise the injured part if a fracture is not suspected.'],
      ['Bila darah tembus kain, tambah kain di atasnya, jangan dibuka. Balut kencang tapi jangan sampai ujung jari membiru.', 'If blood soaks through, add more cloth on top; do not remove it. Bandage firmly but not so tight that fingertips turn blue.'],
      ['Telepon 112/119 untuk pendarahan hebat atau yang tidak berhenti setelah 10 menit. Baringkan korban dan jaga tetap hangat (risiko syok).', 'Call 112/119 for heavy bleeding or bleeding that does not stop after 10 minutes. Lay the person down and keep them warm (shock risk).'],
    ],
    avoid: [
      ['Jangan mencabut benda yang menancap; tekan di sekelilingnya dan balut.', 'Do not pull out an embedded object; press around it and pad it.'],
      ['Jangan memberi makan atau minum.', 'Do not give food or drink.'],
    ],
  },
  {
    id: 'pingsan',
    icon: 'faint',
    title: ['Pingsan', 'Fainting'],
    urgent: false,
    steps: [
      ['Baringkan telentang, tinggikan kaki sekitar 30 cm bila tidak ada cedera kepala atau leher.', 'Lay them on their back and raise the legs about 30 cm if there is no head or neck injury.'],
      ['Longgarkan pakaian di leher dan pinggang, pastikan udara segar.', 'Loosen clothing at the neck and waist and make sure there is fresh air.'],
      ['Periksa napas. Bila tidak bernapas normal, telepon 112/119 dan mulai CPR.', 'Check breathing. If not breathing normally, call 112/119 and start CPR.'],
      ['Bila bernapas tetapi belum sadar, miringkan ke posisi pemulihan (miring ke samping, kepala sedikit menengadah).', 'If breathing but unresponsive, roll into the recovery position (on their side, head slightly tilted back).'],
      ['Telepon 112/119 bila tidak sadar lebih dari 1 menit, terluka karena jatuh, ada nyeri dada, atau hamil/lansia.', 'Call 112/119 if unconscious for more than a minute, injured in the fall, has chest pain, or is pregnant/elderly.'],
    ],
    avoid: [
      ['Jangan memberi minum sebelum sadar penuh.', 'Do not give drinks before they are fully awake.'],
      ['Jangan menampar atau mengguyur dengan air.', 'Do not slap or splash with water.'],
    ],
  },
  {
    id: 'kejang',
    icon: 'seizure',
    title: ['Kejang', 'Seizure'],
    urgent: false,
    steps: [
      ['Catat waktu mulai. Jauhkan benda keras/tajam, alasi kepala dengan sesuatu yang lembut.', 'Note the start time. Move hard or sharp objects away and cushion the head.'],
      ['Longgarkan pakaian di leher. Jangan menahan gerakan tubuhnya.', 'Loosen clothing at the neck. Do not restrain their movements.'],
      ['Setelah kejang berhenti, miringkan ke posisi pemulihan dan temani sampai sadar penuh.', 'When the seizure stops, roll them into the recovery position and stay until fully alert.'],
      ['Telepon 112/119 bila kejang lebih dari 5 menit, berulang, ada cedera, sulit bernapas, tidak sadar setelahnya, kejang pertama kali, hamil, atau anak demam tinggi.', 'Call 112/119 if it lasts over 5 minutes, repeats, there is injury or trouble breathing, they do not wake afterwards, it is a first seizure, or they are pregnant or a child with high fever.'],
    ],
    avoid: [
      ['Jangan memasukkan apa pun ke mulut (sendok, jari).', 'Never put anything in the mouth (spoon, fingers).'],
      ['Jangan memberi minum atau obat sampai sadar penuh.', 'Do not give drinks or medicine until fully alert.'],
    ],
  },
  {
    id: 'ular',
    icon: 'snake',
    title: ['Gigitan ular', 'Snake bite'],
    urgent: true,
    steps: [
      ['Jauhi ular, tenangkan korban dan minta ia tidak banyak bergerak. Telepon 112/119 dan segera ke rumah sakit.', 'Move away from the snake, calm the person and keep them still. Call 112/119 and get to a hospital quickly.'],
      ['Lepas cincin, gelang, atau jam dari bagian yang digigit sebelum bengkak.', 'Remove rings, bracelets or watches from the bitten limb before it swells.'],
      ['Posisikan bagian yang digigit setinggi atau sedikit di bawah jantung dan imobilisasi seperti patah tulang (bidai, balut longgar).', 'Keep the bitten part at or slightly below heart level and immobilise it like a fracture (splint, loose bandage).'],
      ['Ingat bentuk/warna ular atau foto dari jarak aman; jangan menangkapnya.', 'Remember the snake\'s shape/colour or photograph it from a safe distance; do not catch it.'],
    ],
    avoid: [
      ['Jangan mengiris, menyedot, atau mengikat kencang di atas gigitan.', 'Do not cut, suck or tie tightly above the bite.'],
      ['Jangan memakai es, ramuan, atau alkohol.', 'Do not use ice, herbal remedies or alcohol.'],
    ],
  },
  {
    id: 'patah-tulang',
    icon: 'fracture',
    title: ['Patah tulang', 'Broken bone'],
    urgent: false,
    steps: [
      ['Minta korban tidak bergerak. Bila ada luka terbuka, tekan di sekitar tulang dengan kain bersih untuk menghentikan darah.', 'Ask the person to keep still. For an open wound, press around the bone with a clean cloth to stop bleeding.'],
      ['Imobilisasi di posisi ditemukan: bidai dari papan/majalah/kardus yang melewati sendi di atas dan di bawah patahan, ikat longgar.', 'Immobilise in the position found: splint with a board, magazine or cardboard that spans the joints above and below the break, tied loosely.'],
      ['Kompres es terbungkus kain 15–20 menit untuk mengurangi bengkak.', 'Apply ice wrapped in cloth for 15–20 minutes to reduce swelling.'],
      ['Telepon 112/119 bila dugaan patah di leher, punggung, kepala, panggul, paha, atau ada pendarahan hebat. Jangan memindahkan korban.', 'Call 112/119 if a neck, back, head, pelvis or thigh fracture is suspected or bleeding is heavy. Do not move the person.'],
    ],
    avoid: [
      ['Jangan meluruskan tulang yang bengkok atau mendorong tulang yang menonjol masuk.', 'Do not straighten a deformed limb or push protruding bone back in.'],
      ['Jangan mengurut.', 'Do not massage.'],
    ],
  },
]
