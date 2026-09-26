# OneTune DSP

แอปเดียวสำหรับจูน DSP เครื่องเสียงรถยนต์หลายยี่ห้อ (React Native + Expo SDK 57, TypeScript)

## สถานะตอนนี้ (สัปดาห์ 2 ของแผน)

| ส่วน | สถานะ |
|---|---|
| ค้นหาอุปกรณ์ BLE + ขอสิทธิ์ Android 12+ | ✅ ใช้กับเครื่องจริงได้ |
| BLE Inspector (ดู GATT, อ่าน, รับ notify, ส่ง hex, จดโน้ต, แชร์ log เป็น JSON) | ✅ ใช้กับเครื่องจริงได้ |
| หน้าจูน: รถ + ลำโพง, EQ 31 แบนด์, PEQ, ครอสโอเวอร์, เกน, ดีเลย์, เฟส, มิวท์, ลิงก์/คัดลอก L↔R, พิมพ์ตัวเลขได้ทุกช่อง | ✅ ทำงานในโหมดจำลอง |
| Capability profile ต่อรุ่น (NDSK4265AU, PXE-R500, DSPA 810 Pro, AXDSP-X) | ✅ ตามสเปก บางค่ารอยืนยัน |
| ไดรเวอร์จริงของแต่ละยี่ห้อ | ⏳ รอดักแพ็กเก็ตจากเครื่องจริง |
| หน้าสัญญาณเข้า / routing, พรีเซ็ต, Time Alignment จากระยะ | ⏳ มีใน session แล้ว ยังไม่มีหน้าจอ |

**ความปลอดภัย:** ไดรเวอร์ที่ยัง `mapped: false` จะไม่เขียนอะไรลงเครื่องจริงเด็ดขาด คำสั่งไปอยู่ใน log อย่างเดียว

## เริ่มต้น

```bash
npm ci                # .npmrc ตั้ง legacy-peer-deps ไว้แล้ว
npx tsc --noEmit      # typecheck
npm run selftest      # ทดสอบ logic ล้วน (hex, base64, biquad, ครอส, คิวส่งคำสั่ง)
```

Expo Go **ไม่มีโมดูล Bluetooth** เปิดใน Expo Go ได้แค่โหมดจำลองและหน้าพรีวิว ถ้าจะต่อเครื่องจริงต้องใช้ development build หรือ APK:

```bash
# ทางที่ 1: build บนเครื่องตัวเอง (ต้องมี Android Studio + SDK และเสียบมือถือเปิด USB debugging)
npx expo run:android

# ทางที่ 2: build บน EAS cloud (ไม่ต้องลง Android Studio)
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile development   # dev build ต่อกับ `npx expo start`
npx eas-cli@latest build -p android --profile preview       # APK ใช้งานเดี่ยว ๆ แจกให้คนอื่นลองได้
```

ห้ามแก้โฟลเดอร์ `android/` ด้วยมือ ตั้งค่า native ทั้งหมดผ่าน `app.json` (สิทธิ์ BLE มาจาก config plugin ของ `react-native-ble-plx`)

## โครงสร้าง

```
src/
  app/                 หน้าจอ (Expo Router)
    index.tsx          ค้นหาอุปกรณ์ + พรีวิวหน้าจูนตามรุ่น
    inspector.tsx      BLE Inspector / log
    tune.tsx           หน้าจูน
  ble/
    client.ts          ห่อ react-native-ble-plx (scan, connect, MTU, read, write, notify)
    connection.ts      สถานะการเชื่อมต่อปัจจุบัน
    writeQueue.ts      คิวส่งคำสั่ง รวมค่าที่ key ซ้ำ ส่งทีละตัวทุก 80 ms
    captureLog.ts      log ส่ง/รับ/โน้ต แชร์เป็น JSON
    permissions.ts     สิทธิ์ Android
  drivers/
    types.ts           CapabilityProfile, Driver, Change, Frame
    profiles.ts        สเปกแต่ละรุ่น + รูปแบบชื่อ advertise ที่ใช้จำเครื่อง
    demo.ts            ไดรเวอร์จำลอง (รูปแบบเฟรมสมมติ)
    registry.ts        รุ่น → ไดรเวอร์
  model/
    tuning.ts          โมเดลช่องลำโพง, layout 6/8/10 ช่อง, ค่าเริ่มต้น
    session.ts         สถานะการจูน + ลิงก์ L/R + ส่งผ่านคิว
  lib/                 hex/base64, biquad math, format
  components/          CarView, ResponseGraph, EqBars, ChannelSheet, NumberPrompt, ui
scripts/selftest.ts    ทดสอบ logic ใน Node
```

หลักคิด: UI ไม่รู้จักยี่ห้อ UI อ่าน `CapabilityProfile` แล้วแสดงเฉพาะตัวเลือกและช่วงค่าที่รุ่นนั้นรับได้ ส่วนไดรเวอร์แปลง `Change` (เช่น "EQ ช่อง TW_L แบนด์ 18 เปลี่ยน") เป็นไบต์ของยี่ห้อนั้น

## ขั้นตอนแมพโปรโตคอลเครื่องใหม่

1. **ดูโครงสร้าง**: เปิดแอปเรา → ค้นหา → แตะเครื่อง → Inspector จะแสดง service/characteristic ทั้งหมด จดตัวที่มี W/WnR (ส่งคำสั่ง) และ N (รับค่ากลับ)
2. **ดักคำสั่งจากแอปของแท้**: มือถือ Android → Developer options → เปิด *Bluetooth HCI snoop log* → ปิด/เปิด Bluetooth → ใช้แอปของแท้ปรับค่า**ทีละอย่าง** จดเวลาไว้ (เช่น 14:02:10 ปรับ EQ 1k จาก 0 เป็น +3) → `adb bugreport` → เปิด `btsnoop_hci.log` ใน Wireshark กรอง `btatt`
3. **ทำตารางคำสั่ง**: เทียบค่าที่เปลี่ยนกับไบต์ที่เปลี่ยน หา header, รหัสคำสั่ง, ตำแหน่ง channel/band, รูปแบบตัวเลข (x10, offset, little/big endian) และ checksum
4. **ยืนยันด้วย Inspector**: พิมพ์ hex ที่คิดว่าถูกแล้วกดส่ง ฟังว่าเสียงเปลี่ยนตามไหม ใช้ "จด" บันทึกผลไว้ใน log
5. **เขียนไดรเวอร์**: สร้างไฟล์ใน `src/drivers/` ที่ implement `encode()` ใส่ `ble` target (service/char UUID) ตั้ง `mapped: true` แล้วลงทะเบียนใน `registry.ts` ปรับ `profiles.ts` ให้ตรงค่าจริงและเอา `unverified` ออก
6. เพิ่มเทสไบต์ที่ถอดได้ใน `scripts/selftest.ts` เพื่อกันถอยหลัง

ข้อควรระวัง: ทดสอบกับลำโพงถูก ๆ หรือ dummy load ที่วอลุ่มต่ำก่อนเสมอ ค่าครอสที่ผิด (เช่น HPF ทวีตเตอร์หลุดไป 20 Hz) ทำลำโพงเสียได้ และไม่นำโค้ดหรือไฟล์จากแอปของแบรนด์มาใช้หรือแจกต่อ เขียนการสื่อสารเองจากสิ่งที่สังเกตได้จากเครื่องของเราเท่านั้น
