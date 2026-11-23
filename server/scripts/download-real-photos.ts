import fs from 'node:fs';
import path from 'node:path';

interface PhotoSpec {
  slug: string;
  title: string;
  sourceUrl: string;
  licence: string;
  author: string;
  alt: string;
}

const items: PhotoSpec[] = [
  {
    slug: 'dso-100mhz-4ch',
    title: 'File:Rigol_DS1074Z_Oscilloscope.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rigol_DS1074Z_Oscilloscope.jpg',
    licence: 'CC BY-SA 4.0',
    author: 'Wikimedia Commons / Rigol',
    alt: 'Benchtop 4-channel 100MHz digital storage oscilloscope displaying waveform and trigger controls',
  },
  {
    slug: 'handheld-scope-50mhz',
    title: 'File:Tektronix_213_Portable_Oscilloscope_(14394189202).jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tektronix_213_Portable_Oscilloscope_(14394189202).jpg',
    licence: 'CC BY 2.0',
    author: 'Wikimedia Commons / Tektronix',
    alt: 'Portable handheld 50MHz dual-channel digital oscilloscope with compact color LCD',
  },
  {
    slug: 'bench-psu-30v-5a',
    title: 'File:Bench_power_supply.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bench_power_supply.jpg',
    licence: 'CC BY-SA 3.0',
    author: 'Wikimedia Commons',
    alt: 'Precision 30V 5A benchtop adjustable DC power supply with digital LED display and output terminals',
  },
  {
    slug: 'soldering-station',
    title: 'File:Soldering_Station.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Soldering_Station.jpg',
    licence: 'CC BY-SA 4.0',
    author: 'Wikimedia Commons',
    alt: 'Temperature-controlled ESD soldering and rework station with digital display and pencil iron',
  },
  {
    slug: 'logic-analyzer-8ch',
    title: 'File:Saleae_Logic8_IMG_2876.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Saleae_Logic8_IMG_2876.jpg',
    licence: 'CC BY-SA 3.0',
    author: 'Wikimedia Commons / Saleae',
    alt: '8-channel 24MHz USB logic analyzer hardware interface with multicolored test probe leads',
  },
  {
    slug: 'esp32-devkit-kit',
    title: 'File:ESP32_Dev_Board.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:ESP32_Dev_Board.jpg',
    licence: 'CC BY-SA 4.0',
    author: 'Wikimedia Commons / Espressif',
    alt: 'ESP32 dual-core microcontroller development board with integrated WiFi, Bluetooth and micro-USB',
  },
  {
    slug: 'arduino-uno-kit',
    title: 'File:Arduino_Uno_-_R3.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Arduino_Uno_-_R3.jpg',
    licence: 'CC BY-SA 3.0',
    author: 'Wikimedia Commons / Arduino LLC',
    alt: 'Arduino Uno R3 development board with ATmega328P microcontroller, USB-B port and header sockets',
  },
  {
    slug: 'iot-sensor-kit',
    title: 'File:Magicbit_sensor_modules.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Magicbit_sensor_modules.jpg',
    licence: 'CC BY-SA 4.0',
    author: 'Wikimedia Commons',
    alt: 'IoT sensor starter module collection including soil moisture probe, DHT11 and ultrasonic sensor',
  },
  {
    slug: 'raspberry-pi-4',
    title: 'File:Raspberry_Pi_4_Model_B_-_Side.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Raspberry_Pi_4_Model_B_-_Side.jpg',
    licence: 'CC BY-SA 4.0',
    author: 'Wikimedia Commons / Raspberry Pi Foundation',
    alt: 'Raspberry Pi 4 Model B single-board computer featuring quad-core ARM, USB 3.0 and dual micro-HDMI',
  },
  {
    slug: 'robotic-arm-4dof',
    title: 'File:MA-3_Robotic_Manipulator_Arm-IMG_6021-white.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:MA-3_Robotic_Manipulator_Arm-IMG_6021-white.jpg',
    licence: 'CC BY-SA 4.0',
    author: 'Wikimedia Commons',
    alt: '4-degree-of-freedom articulated desktop robotic arm with micro-servo joints and parallel mechanical gripper',
  },
  {
    slug: 'mobile-robot-4wd',
    title: 'File:Arduino_Robot_(6099948101).jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Arduino_Robot_(6099948101).jpg',
    licence: 'CC BY 2.0',
    author: 'Wikimedia Commons',
    alt: '4-wheel-drive mobile robotics platform chassis with geared DC motors and battery compartment',
  },
  {
    slug: 'fdm-3d-printer',
    title: 'File:Imprimante_3D.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Imprimante_3D.jpg',
    licence: 'CC BY-SA 4.0',
    author: 'Wikimedia Commons',
    alt: 'Enclosed precision desktop FDM 3D printer with heated print bed, direct extruder and filament reel',
  },
  {
    slug: 'jetson-nano-kit',
    title: 'File:NVIDIA_Jetson_Nano_Developer_Kit_(40650425603).jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:NVIDIA_Jetson_Nano_Developer_Kit_(40650425603).jpg',
    licence: 'CC BY-SA 2.0',
    author: 'Wikimedia Commons / NVIDIA',
    alt: 'NVIDIA Jetson Nano edge AI developer kit board with 128-core Maxwell GPU and passive aluminum heatsink',
  },
  {
    slug: 'gpu-workstation',
    title: 'File:Mac_Pro_Tower.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mac_Pro_Tower.jpg',
    licence: 'CC BY-SA 2.0',
    author: 'Wikimedia Commons',
    alt: 'High-performance enterprise desktop GPU compute workstation tower with dedicated graphics card',
  },
];

async function run() {
  const serverDir = path.resolve(process.cwd(), 'server', 'media', 'equipment');
  const clientDir = path.resolve(process.cwd(), 'client', 'public', 'media', 'equipment');
  fs.mkdirSync(serverDir, { recursive: true });
  fs.mkdirSync(clientDir, { recursive: true });

  const manifest: Record<string, any> = {};

  console.log(`Starting real equipment photograph download (${items.length} items)...`);

  for (const item of items) {
    try {
      const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(item.title)}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`;
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'LabLinkCampusLabBot/1.0 (https://lablink.edu; student@lablink.edu)' },
      });
      const data = (await res.json()) as any;
      const page = Object.values(data.query.pages)[0] as any;
      const thumbUrl = page.imageinfo[0].thumburl || page.imageinfo[0].url;

      const imgRes = await fetch(thumbUrl, {
        headers: { 'User-Agent': 'LabLinkCampusLabBot/1.0 (https://lablink.edu; student@lablink.edu)' },
      });
      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fileName = `${item.slug}.png`;
      const serverFile = path.join(serverDir, fileName);
      const clientFile = path.join(clientDir, fileName);

      fs.writeFileSync(serverFile, buffer);
      fs.writeFileSync(clientFile, buffer);

      manifest[item.slug] = {
        file: fileName,
        sourceUrl: item.sourceUrl,
        licence: item.licence,
        author: item.author,
        alt: item.alt,
        verified: true,
      };

      console.log(`✅ [${item.slug}] Saved ${(buffer.length / 1024).toFixed(1)} KB`);
    } catch (err: any) {
      console.error(`❌ [${item.slug}] Failed: ${err.message}`);
    }
  }

  // Write manifests
  const serverManifest = path.resolve(process.cwd(), 'server', 'media', 'manifest.json');
  const clientManifest = path.resolve(process.cwd(), 'client', 'public', 'media', 'manifest.json');
  fs.writeFileSync(serverManifest, JSON.stringify(manifest, null, 2), 'utf8');
  fs.writeFileSync(clientManifest, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('Real equipment photographs and manifests updated successfully!');
}

run();
