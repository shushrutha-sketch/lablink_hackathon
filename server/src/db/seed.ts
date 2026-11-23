import bcrypt from 'bcryptjs';
import { db } from './connection.js';
import { runMigrations } from './migrate.js';
import { formatLocalDate, addDays } from '../domain/timeUtils.js';

export function seedDatabase() {
  console.log('Resetting and seeding database to Part III Revision 3 specifications...');

  // Drop old tables so schema changes apply cleanly
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DROP TABLE IF EXISTS chat_messages;');
  db.exec('DROP TABLE IF EXISTS audit_log;');
  db.exec('DROP TABLE IF EXISTS booking_requests;');
  db.exec('DROP TABLE IF EXISTS equipment_capabilities;');
  db.exec('DROP TABLE IF EXISTS capabilities;');
  db.exec('DROP TABLE IF EXISTS equipment;');
  db.exec('DROP TABLE IF EXISTS users;');
  db.exec('DROP TABLE IF EXISTS departments;');
  try {
    db.exec('DELETE FROM sqlite_sequence;');
  } catch (e) {
    // ignore
  }
  db.exec('PRAGMA foreign_keys = ON;');

  runMigrations();

  // 1. Departments (3 departments as specified in Section 30)
  const insertDept = db.prepare('INSERT INTO departments (code, name) VALUES (?, ?)');
  insertDept.run('ECE', 'Department of Electrical & Computer Engineering');
  insertDept.run('ME', 'Department of Mechanical Engineering');
  insertDept.run('CSE', 'Department of Computer Science & Engineering');

  const deptRows = db.prepare('SELECT id, code FROM departments').all() as Array<{ id: number; code: string }>;
  const deptMap: Record<string, number> = {};
  for (const d of deptRows) {
    deptMap[d.code] = d.id;
  }

  // 2. Capabilities (15 controlled vocabulary capabilities from Section 30)
  const insertCap = db.prepare(`
    INSERT INTO capabilities (name, label, description, keywords)
    VALUES (?, ?, ?, ?)
  `);

  const capabilitiesData = [
    {
      name: 'microcontroller',
      label: 'Microcontroller',
      description: 'Embedded MCU firmware execution, flashing, and GPIO control.',
      keywords: ['microcontroller', 'mcu', 'arduino', 'esp32', 'embedded', 'firmware', 'c++', 'c'],
    },
    {
      name: 'wifi-connectivity',
      label: 'WiFi Connectivity',
      description: '802.11 b/g/n wireless telemetry, HTTP/MQTT transmission, and IoT web server.',
      keywords: ['wifi', 'wireless', 'iot', 'mqtt', 'http', 'cloud', 'internet', 'network'],
    },
    {
      name: 'bluetooth',
      label: 'Bluetooth',
      description: 'Bluetooth Low Energy (BLE) peripheral, service advertising, and smartphone pairing.',
      keywords: ['bluetooth', 'ble', 'wireless', 'beacon', 'pairing'],
    },
    {
      name: 'sensor-interfacing',
      label: 'Sensor Interfacing',
      description: 'Analog and digital sensor integration via ADC, I2C, SPI, and UART buses.',
      keywords: ['sensor', 'interfacing', 'adc', 'i2c', 'spi', 'analog', 'soil', 'moisture', 'temperature', 'dht11'],
    },
    {
      name: 'signal-analysis',
      label: 'Signal Analysis',
      description: 'Waveform characterization, transient capture, bandwidth, and oscilloscope debugging.',
      keywords: ['signal-analysis', 'oscilloscope', 'scope', 'waveform', 'analog', 'transient', 'debugging', 'voltage'],
    },
    {
      name: 'digital-signal-capture',
      label: 'Digital Signal Capture',
      description: 'Multi-channel digital bus timing analysis and automated protocol decoding.',
      keywords: ['logic-analyzer', 'digital-signal-capture', 'protocols', 'sniffing', 'timing', 'spi', 'i2c', 'uart'],
    },
    {
      name: 'power-supply',
      label: 'Power Supply',
      description: 'Regulated adjustable DC benchtop voltage and current sourcing.',
      keywords: ['power-supply', 'voltage', 'current', 'bench-power', 'psu', 'dc', 'regulation'],
    },
    {
      name: 'soldering-prototyping',
      label: 'Soldering & Prototyping',
      description: 'Through-hole and SMD electronic circuit assembly, desoldering, and rework.',
      keywords: ['soldering', 'soldering-prototyping', 'rework', 'smd', 'circuit-assembly', 'breadboard', 'pcb'],
    },
    {
      name: 'linux-computing',
      label: 'Linux Computing',
      description: 'Single-board ARM Linux operating system, bash scripting, and edge applications.',
      keywords: ['linux', 'linux-computing', 'raspberry-pi', 'arm', 'debian', 'ubuntu', 'bash', 'os'],
    },
    {
      name: 'computer-vision',
      label: 'Computer Vision',
      description: 'Real-time camera video stream ingestion, OpenCV, object tracking, and filtering.',
      keywords: ['computer-vision', 'vision', 'opencv', 'camera', 'image-processing', 'object-detection', 'tracking'],
    },
    {
      name: 'machine-learning',
      label: 'Machine Learning',
      description: 'Neural network model inference, PyTorch, TensorFlow, and Edge AI deployment.',
      keywords: ['machine-learning', 'ml', 'ai', 'deep-learning', 'pytorch', 'tensorflow', 'neural-network', 'inference'],
    },
    {
      name: 'gpu-compute',
      label: 'GPU Compute',
      description: 'Parallel CUDA hardware accelerator cores for high-throughput matrix computations.',
      keywords: ['gpu', 'gpu-compute', 'cuda', 'parallel', 'tensor', 'acceleration'],
    },
    {
      name: 'robotics-actuation',
      label: 'Robotics Actuation',
      description: 'Servo motor joint positioning, kinematics, end-effector gripping, and motion planning.',
      keywords: ['robotics', 'robotics-actuation', 'servo', 'gripper', 'arm', 'kinematics', 'actuator', 'motors'],
    },
    {
      name: 'mobile-robotics',
      label: 'Mobile Robotics',
      description: 'Wheeled robot chassis, DC motor encoders, differential drive, and obstacle avoidance.',
      keywords: ['mobile-robotics', 'robot', 'chassis', 'wheels', '4wd', 'differential-drive', 'navigation'],
    },
    {
      name: '3d-printing',
      label: '3D Printing',
      description: 'Additive layer manufacturing, FDM filament deposition, and CAD mechanical enclosure fabrication.',
      keywords: ['3d-printing', 'print', 'fdm', 'filament', 'pla', 'enclosure', 'cad', 'prototyping', 'fabrication'],
    },
  ];

  for (const c of capabilitiesData) {
    insertCap.run(c.name, c.label, c.description, JSON.stringify(c.keywords));
  }

  // 3. Demo Users (Section 4.1 & 11)
  const demoPassword = process.env.DEMO_PASSWORD || 'password123';
  const passwordHash = bcrypt.hashSync(demoPassword, 10);
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, department_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertUser.run('Asha Sharma', 'asha@campus.edu', passwordHash, 'student', deptMap.ECE);
  insertUser.run('Ravi Patel', 'ravi@campus.edu', passwordHash, 'student', deptMap.ECE);
  insertUser.run('Meera Reddy', 'meera@campus.edu', passwordHash, 'student', deptMap.ECE);
  insertUser.run('Dr. K. Rao', 'dr.rao@campus.edu', passwordHash, 'faculty', deptMap.ECE);
  insertUser.run('Prof. Vikram Sen', 'prof.sen@campus.edu', passwordHash, 'faculty', deptMap.ME);
  insertUser.run('Chief Elena Rostova', 'admin@campus.edu', passwordHash, 'admin', deptMap.ECE);

  const userRows = db.prepare('SELECT id, email FROM users').all() as Array<{ id: number; email: string }>;
  const userMap: Record<string, number> = {};
  for (const u of userRows) {
    userMap[u.email] = u.id;
  }

  // 4. Equipment Items (Exact 14 Demonstration Items from Section 30)
  const insertEquip = db.prepare(`
    INSERT INTO equipment (
      slug, name, category, family, department_id, lab, location, description,
      specs, compatible_projects, quantity, min_session_minutes, max_session_minutes,
      status, image_path, image_alt, image_credit, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const equipmentData = [
    {
      slug: 'dso-100mhz-4ch',
      name: 'Digital Storage Oscilloscope',
      category: 'Electronics',
      family: 'oscilloscope',
      dept: deptMap.ECE,
      lab: 'Electronics Lab',
      location: 'Shannon Engineering Hall, Room 302',
      description: 'High-precision 100MHz 4-channel digital storage oscilloscope with real-time waveform inspection, automated cursor measurements, and trigger holdoff.',
      specs: [
        { key: 'bandwidth_mhz', label: 'Bandwidth', value: 100, unit: 'MHz', higherIsBetter: true },
        { key: 'channels', label: 'Channels', value: 4, unit: 'ch', higherIsBetter: true },
        { key: 'sample_rate_msps', label: 'Sample Rate', value: 1000, unit: 'MS/s', higherIsBetter: true },
      ],
      compatible_projects: ['Signal integrity analysis', 'Analog filter tuning', 'High-frequency transient capture'],
      quantity: 1,
      min: 30,
      max: 180,
      status: 'active',
      image_path: 'dso-100mhz-4ch.png',
      image_alt: 'Benchtop 4-channel 100MHz digital storage oscilloscope displaying waveform and trigger controls',
      image_credit: 'LabLink Hardware Archive (CC BY-SA 4.0)',
      capabilities: [{ cap: 'signal-analysis', level: 'full' }],
    },
    {
      slug: 'handheld-scope-50mhz',
      name: 'Handheld Oscilloscope',
      category: 'Electronics',
      family: 'oscilloscope',
      dept: deptMap.ECE,
      lab: 'Electronics Lab',
      location: 'Shannon Engineering Hall, Room 302',
      description: 'Portable battery-powered 50MHz dual-channel digital oscilloscope for quick in-circuit probing, sensor signal checks, and fieldwork.',
      specs: [
        { key: 'bandwidth_mhz', label: 'Bandwidth', value: 50, unit: 'MHz', higherIsBetter: true },
        { key: 'channels', label: 'Channels', value: 2, unit: 'ch', higherIsBetter: true },
        { key: 'sample_rate_msps', label: 'Sample Rate', value: 250, unit: 'MS/s', higherIsBetter: true },
      ],
      compatible_projects: ['Field sensor diagnostics', 'Audio waveform verification', 'Basic PWM frequency testing'],
      quantity: 2,
      min: 30,
      max: 120,
      status: 'active',
      image_path: 'handheld-scope-50mhz.png',
      image_alt: 'Portable handheld 50MHz dual-channel digital oscilloscope with compact color LCD',
      image_credit: 'LabLink Hardware Archive (CC BY-SA 4.0)',
      capabilities: [{ cap: 'signal-analysis', level: 'full' }],
    },
    {
      slug: 'bench-psu-30v-5a',
      name: 'Bench Power Supply',
      category: 'Electronics',
      family: 'power-supply',
      dept: deptMap.ECE,
      lab: 'Electronics Lab',
      location: 'Shannon Engineering Hall, Room 304',
      description: 'Linear regulated benchtop DC power supply providing 0-30V and 0-5A with dual LED displays, constant current (CC), and constant voltage (CV) modes.',
      specs: [
        { key: 'voltage_max_v', label: 'Max Voltage', value: 30, unit: 'V', higherIsBetter: true },
        { key: 'current_max_a', label: 'Max Current', value: 5, unit: 'A', higherIsBetter: true },
      ],
      compatible_projects: ['Circuit board power bring-up', 'LED driver benchmarking', 'Motor stall current testing'],
      quantity: 4,
      min: 30,
      max: 120,
      status: 'active',
      image_path: 'bench-psu-30v-5a.png',
      image_alt: 'Precision 30V 5A benchtop adjustable DC power supply with digital LED display and output terminals',
      image_credit: 'LabLink Hardware Archive (CC BY 3.0)',
      capabilities: [{ cap: 'power-supply', level: 'full' }],
    },
    {
      slug: 'soldering-station',
      name: 'Soldering and Rework Station',
      category: 'Electronics',
      family: 'rework-tool',
      dept: deptMap.ECE,
      lab: 'Electronics Lab',
      location: 'Shannon Engineering Hall, Room 308',
      description: 'ESD-safe temperature-controlled soldering station with PID micro-temperature regulation, precision pencil iron, and brass tip cleaner.',
      specs: [{ key: 'temp_max_c', label: 'Max Temperature', value: 450, unit: '°C', higherIsBetter: true }],
      compatible_projects: ['Through-hole header soldering', 'SMD component rework', 'Custom sensor wiring harness'],
      quantity: 4,
      min: 30,
      max: 120,
      status: 'active',
      image_path: 'soldering-station.png',
      image_alt: 'Temperature-controlled ESD soldering and rework station with digital display and pencil iron',
      image_credit: 'LabLink Hardware Archive (CC BY-SA 4.0)',
      capabilities: [{ cap: 'soldering-prototyping', level: 'full' }],
    },
    {
      slug: 'logic-analyzer-8ch',
      name: 'USB Logic Analyzer',
      category: 'Electronics',
      family: 'signal-capture',
      dept: deptMap.ECE,
      lab: 'Electronics Lab',
      location: 'Shannon Engineering Hall, Room 302',
      description: '8-channel 24MHz USB logic analyzer hardware interface with automated software protocol decoding for I2C, SPI, UART, and CAN protocols.',
      specs: [
        { key: 'channels', label: 'Channels', value: 8, unit: 'ch', higherIsBetter: true },
        { key: 'sample_rate_msps', label: 'Sample Rate', value: 100, unit: 'MS/s', higherIsBetter: true },
      ],
      compatible_projects: ['SPI flash dump debugging', 'I2C sensor communication verification', 'UART packet timing inspection'],
      quantity: 3,
      min: 30,
      max: 120,
      status: 'active',
      image_path: 'logic-analyzer-8ch.png',
      image_alt: '8-channel 24MHz USB logic analyzer hardware interface with multicolored test probe leads',
      image_credit: 'LabLink Hardware Archive (CC BY 3.0)',
      capabilities: [{ cap: 'digital-signal-capture', level: 'full' }],
    },
    {
      slug: 'esp32-devkit-kit',
      name: 'ESP32 Development Kit',
      category: 'IoT',
      family: 'mcu-dev-board',
      dept: deptMap.ECE,
      lab: 'IoT Lab',
      location: 'Communications Wing, Room 210',
      description: 'Tensilica dual-core 240MHz microcontroller development board with integrated 802.11 b/g/n WiFi and Bluetooth 4.2 BLE for cloud-connected IoT prototypes.',
      specs: [
        { key: 'clock_mhz', label: 'Clock Speed', value: 240, unit: 'MHz', higherIsBetter: true },
        { key: 'flash_kb', label: 'Flash Memory', value: 4096, unit: 'KB', higherIsBetter: true },
      ],
      compatible_projects: ['Smart agriculture monitor', 'Weather station', 'MQTT sensor gateway'],
      quantity: 8,
      min: 30,
      max: 180,
      status: 'active',
      image_path: 'esp32-devkit-kit.png',
      image_alt: 'ESP32 dual-core microcontroller development board with integrated WiFi, Bluetooth and micro-USB',
      image_credit: 'LabLink Hardware Archive (CC BY-SA 4.0)',
      capabilities: [
        { cap: 'microcontroller', level: 'full' },
        { cap: 'wifi-connectivity', level: 'full' },
        { cap: 'bluetooth', level: 'full' },
        { cap: 'sensor-interfacing', level: 'full' },
      ],
    },
    {
      slug: 'arduino-uno-kit',
      name: 'Arduino Uno R3 Kit',
      category: 'IoT',
      family: 'mcu-dev-board',
      dept: deptMap.ECE,
      lab: 'IoT Lab',
      location: 'Communications Wing, Room 210',
      description: 'Standard ATmega328P 16MHz microcontroller board with standard shield headers, 14 digital I/O pins, and 6 analog inputs.',
      specs: [
        { key: 'clock_mhz', label: 'Clock Speed', value: 16, unit: 'MHz', higherIsBetter: true },
        { key: 'flash_kb', label: 'Flash Memory', value: 32, unit: 'KB', higherIsBetter: true },
      ],
      compatible_projects: ['Basic sensor logging', 'Stepper motor control', 'Classroom robotics basics'],
      quantity: 10,
      min: 30,
      max: 180,
      status: 'active',
      image_path: 'arduino-uno-kit.png',
      image_alt: 'Arduino Uno R3 development board with ATmega328P microcontroller, USB-B port and header sockets',
      image_credit: 'LabLink Hardware Archive (CC BY-SA 3.0)',
      capabilities: [
        { cap: 'microcontroller', level: 'full' },
        { cap: 'sensor-interfacing', level: 'full' },
        { cap: 'wifi-connectivity', level: 'partial', limitation: 'Needs an external WiFi module, no onboard wireless' },
      ],
    },
    {
      slug: 'iot-sensor-kit',
      name: 'IoT Sensor Starter Kit',
      category: 'IoT',
      family: 'sensor-module',
      dept: deptMap.ECE,
      lab: 'IoT Lab',
      location: 'Communications Wing, Room 212',
      description: 'Comprehensive sensor module kit containing soil moisture probe, DHT11 temp/humidity, HC-SR04 ultrasonic distance, LDR light, and PIR motion sensor.',
      specs: [{ key: 'sensor_count', label: 'Sensor Types', value: 5, unit: 'types', higherIsBetter: true }],
      compatible_projects: ['Smart agriculture monitor', 'Weather station', 'Smart home sensing'],
      quantity: 6,
      min: 30,
      max: 180,
      status: 'active',
      image_path: 'iot-sensor-kit.png',
      image_alt: 'IoT sensor starter module collection including soil moisture probe, DHT11 and ultrasonic sensor',
      image_credit: 'LabLink Hardware Archive (CC BY 4.0)',
      capabilities: [{ cap: 'sensor-interfacing', level: 'full' }],
    },
    {
      slug: 'raspberry-pi-4',
      name: 'Raspberry Pi 4 Model B Kit',
      category: 'IoT',
      family: 'sbc-linux',
      dept: deptMap.ECE,
      lab: 'IoT Lab',
      location: 'Communications Wing, Room 214',
      description: 'Quad-core 1.5GHz ARM Cortex-A72 computer with 4GB LPDDR4 RAM, Gigabit Ethernet, dual micro-HDMI 4K video, and full Linux terminal environment.',
      specs: [
        { key: 'ram_gb', label: 'RAM', value: 4, unit: 'GB', higherIsBetter: true },
        { key: 'cpu_cores', label: 'CPU Cores', value: 4, unit: 'cores', higherIsBetter: true },
      ],
      compatible_projects: ['Edge gateway hub', 'Local database recorder', 'Lightweight computer vision'],
      quantity: 6,
      min: 30,
      max: 240,
      status: 'active',
      image_path: 'raspberry-pi-4.png',
      image_alt: 'Raspberry Pi 4 Model B single-board computer featuring quad-core ARM, USB 3.0 and dual micro-HDMI',
      image_credit: 'LabLink Hardware Archive (CC BY-SA 4.0)',
      capabilities: [
        { cap: 'linux-computing', level: 'full' },
        { cap: 'wifi-connectivity', level: 'full' },
        { cap: 'bluetooth', level: 'full' },
        { cap: 'sensor-interfacing', level: 'full' },
        { cap: 'computer-vision', level: 'partial', limitation: 'Light models at low frame rates only' },
      ],
    },
    {
      slug: 'robotic-arm-4dof',
      name: 'Desktop Robotic Arm (4-DOF)',
      category: 'Robotics',
      family: 'manipulator',
      dept: deptMap.ME,
      lab: 'Robotics and Fabrication Lab',
      location: 'Maxwell Mechanical Wing, Bay 2',
      description: 'Desktop 4-axis articulated robotic manipulator with metal-gear servo joints, inverse kinematics controller, and parallel pick-and-place gripper.',
      specs: [
        { key: 'dof', label: 'Degrees of Freedom', value: 4, unit: 'DOF', higherIsBetter: true },
        { key: 'payload_g', label: 'Payload', value: 500, unit: 'g', higherIsBetter: true },
      ],
      compatible_projects: ['Automated sorting assembly', 'Kinematics trajectory verification', 'Visual servoing grasp test'],
      quantity: 2,
      min: 60,
      max: 240,
      status: 'active',
      image_path: 'robotic-arm-4dof.png',
      image_alt: '4-degree-of-freedom articulated desktop robotic arm with micro-servo joints and parallel mechanical gripper',
      image_credit: 'LabLink Hardware Archive (CC BY-SA 4.0)',
      capabilities: [{ cap: 'robotics-actuation', level: 'full' }],
    },
    {
      slug: 'mobile-robot-4wd',
      name: '4WD Mobile Robot Platform',
      category: 'Robotics',
      family: 'mobile-platform',
      dept: deptMap.ME,
      lab: 'Robotics and Fabrication Lab',
      location: 'Maxwell Mechanical Wing, Bay 3',
      description: 'Sturdy four-wheel-drive aluminum chassis equipped with geared DC motors, optical speed encoders, and mounting plates for sensor payloads.',
      specs: [
        { key: 'wheels', label: 'Wheels', value: 4, unit: 'wheels', higherIsBetter: true },
        { key: 'payload_kg', label: 'Payload', value: 2, unit: 'kg', higherIsBetter: true },
      ],
      compatible_projects: ['Autonomous SLAM navigation', 'Line following racer', 'Warehouse AGV dispatch'],
      quantity: 3,
      min: 60,
      max: 240,
      status: 'active',
      image_path: 'mobile-robot-4wd.png',
      image_alt: '4-wheel-drive mobile robotics platform chassis with geared DC motors and battery compartment',
      image_credit: 'LabLink Hardware Archive (CC BY 3.0)',
      capabilities: [
        { cap: 'mobile-robotics', level: 'full' },
        { cap: 'robotics-actuation', level: 'partial', limitation: 'Drive motors only, no manipulator' },
      ],
    },
    {
      slug: 'fdm-3d-printer',
      name: 'FDM 3D Printer',
      category: 'Robotics',
      family: 'fdm-printer',
      dept: deptMap.ME,
      lab: 'Robotics and Fabrication Lab',
      location: 'Maxwell Mechanical Wing, Rapid Prototyping Bay 1',
      description: 'Precision desktop FDM 3D printer with direct-drive extruder, 220mm heated bed, automatic bed leveling, and silent stepper drivers for PLA/PETG.',
      specs: [{ key: 'build_x_mm', label: 'Build Area', value: 220, unit: 'mm', higherIsBetter: true }],
      compatible_projects: ['Custom sensor enclosure', 'Robotic arm bracket', 'Drone chassis prototype'],
      quantity: 2,
      min: 60,
      max: 240,
      status: 'active',
      image_path: 'fdm-3d-printer.png',
      image_alt: 'Enclosed precision desktop FDM 3D printer with heated print bed, direct extruder and filament reel',
      image_credit: 'LabLink Hardware Archive (CC BY-SA 4.0)',
      capabilities: [{ cap: '3d-printing', level: 'full' }],
    },
    {
      slug: 'jetson-nano-kit',
      name: 'NVIDIA Jetson Nano Developer Kit',
      category: 'Computing',
      family: 'edge-ai-compute',
      dept: deptMap.CSE,
      lab: 'Computing Lab',
      location: 'Turing Computer Science Building, Room 402',
      description: '128-core NVIDIA Maxwell GPU edge AI system with 4GB RAM delivering 472 GFLOPS for real-time deep learning inference and multiple camera streams.',
      specs: [
        { key: 'cuda_cores', label: 'CUDA Cores', value: 128, unit: 'cores', higherIsBetter: true },
        { key: 'ram_gb', label: 'RAM', value: 4, unit: 'GB', higherIsBetter: true },
      ],
      compatible_projects: ['Real-time object detection', 'Edge AI pedestrian analytics', 'Autonomous vehicle lane detection'],
      quantity: 3,
      min: 60,
      max: 240,
      status: 'active',
      image_path: 'jetson-nano-kit.png',
      image_alt: 'NVIDIA Jetson Nano edge AI developer kit board with 128-core Maxwell GPU and passive aluminum heatsink',
      image_credit: 'LabLink Hardware Archive (CC BY-SA 4.0)',
      capabilities: [
        { cap: 'linux-computing', level: 'full' },
        { cap: 'computer-vision', level: 'full' },
        { cap: 'machine-learning', level: 'partial', limitation: 'Inference and small models, not large-scale training' },
        { cap: 'gpu-compute', level: 'partial', limitation: '128 CUDA cores' },
      ],
    },
    {
      slug: 'gpu-workstation',
      name: 'GPU Workstation',
      category: 'Computing',
      family: 'gpu-workstation',
      dept: deptMap.CSE,
      lab: 'Computing Lab',
      location: 'Turing Computer Science Building, Room 406',
      description: 'High-performance desktop workstation with 16GB dedicated GPU VRAM, 32GB system DDR5 RAM, and liquid cooling for deep neural network training.',
      specs: [
        { key: 'gpu_vram_gb', label: 'GPU VRAM', value: 16, unit: 'GB', higherIsBetter: true },
        { key: 'ram_gb', label: 'System RAM', value: 32, unit: 'GB', higherIsBetter: true },
      ],
      compatible_projects: ['PyTorch vision transformer training', 'Custom object detection model fine-tuning', 'Diffusion model rendering'],
      quantity: 2,
      min: 60,
      max: 240,
      status: 'active',
      image_path: 'gpu-workstation.png',
      image_alt: 'High-performance enterprise desktop GPU compute workstation tower with dedicated graphics card',
      image_credit: 'LabLink Hardware Archive (CC BY 3.0)',
      capabilities: [
        { cap: 'gpu-compute', level: 'full' },
        { cap: 'machine-learning', level: 'full' },
        { cap: 'computer-vision', level: 'full' },
        { cap: 'linux-computing', level: 'full' },
      ],
    },
  ];

  const insertEquipCap = db.prepare(`
    INSERT INTO equipment_capabilities (equipment_id, capability, level, limitation)
    VALUES (?, ?, ?, ?)
  `);

  const equipIdMap: Record<string, number> = {};

  for (const eq of equipmentData) {
    const res = insertEquip.run(
      eq.slug,
      eq.name,
      eq.category,
      eq.family,
      eq.dept,
      eq.lab,
      eq.location,
      eq.description,
      JSON.stringify(eq.specs),
      JSON.stringify(eq.compatible_projects),
      eq.quantity,
      eq.min,
      eq.max,
      eq.status,
      eq.image_path,
      eq.image_alt,
      eq.image_credit
    );
    const equipId = Number(res.lastInsertRowid);
    equipIdMap[eq.slug] = equipId;

    for (const ec of eq.capabilities) {
      insertEquipCap.run(equipId, ec.cap, ec.level, (ec as any).limitation || null);
    }
  }

  // 5. Historical Approved Bookings (last 30 days)
  // Imbalance according to Section 30 & 41:
  // Ravi (id 2) has 9 approved hours in last 30 days
  // Asha (id 1) has 0 approved hours in last 30 days
  // Meera (id 3) has 1 approved hour in last 30 days
  // 100MHz oscilloscope (id 1) > 85% utilised
  // FDM 3D printer (id 12) ~5% utilised
  const todayStr = formatLocalDate(new Date());

  const insertReq = db.prepare(`
    INSERT INTO booking_requests (
      student_id, equipment_id, project_title, project_description, project_deadline,
      start_time, end_time, status, origin, requirements_json, priority_score,
      score_breakdown, reviewer_id, reviewer_comment, created_at, updated_at, decided_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'form', ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
  `);

  const dsoId = equipIdMap['dso-100mhz-4ch'];
  const fdmId = equipIdMap['fdm-3d-printer'];
  const psuId = equipIdMap['bench-psu-30v-5a'];
  const rpiId = equipIdMap['raspberry-pi-4'];
  const espId = equipIdMap['esp32-devkit-kit'];
  const gpuId = equipIdMap['gpu-workstation'];

  // Seed Ravi with 9 hours of approved bookings (e.g. 3 sessions of 3 hours)
  const raviBookings = [
    { daysAgo: 22, equipId: dsoId, hours: 3, title: 'I2C Master Clock Jitter Analysis' },
    { daysAgo: 14, equipId: dsoId, hours: 3, title: 'Fast Transient Step-Down Voltage Testing' },
    { daysAgo: 5,  equipId: dsoId, hours: 3, title: 'Differential Signal Ringing Characterization' },
  ];

  for (const b of raviBookings) {
    const bookingDate = addDays(todayStr, -b.daysAgo);
    const startIso = `${bookingDate}T10:00`;
    const endIso = `${bookingDate}T${String(10 + b.hours).padStart(2, '0')}:00`;
    const deadline = addDays(bookingDate, 3);
    insertReq.run(
      userMap['ravi@campus.edu'],
      b.equipId,
      b.title,
      'Senior ECE instrumentation lab coursework.',
      deadline,
      startIso,
      endIso,
      'approved',
      JSON.stringify([{ capability: 'signal-analysis', priority: 'must', reason: 'High-speed signal debugging' }]),
      75.0,
      JSON.stringify({ urgency: 80, suitability: 25, fairness: 15, efficiency: 10, total: 75 }),
      userMap['dr.rao@campus.edu'],
      'Approved: Laboratory slot assigned.'
    );
  }

  // Seed Meera with 1 hour
  const meeraBookings = [
    { daysAgo: 18, equipId: psuId, hours: 1, title: 'Sensor Voltage Regulator Characterization' }
  ];
  for (const b of meeraBookings) {
    const bookingDate = addDays(todayStr, -b.daysAgo);
    insertReq.run(
      userMap['meera@campus.edu'],
      b.equipId,
      b.title,
      'Regulator ripple check.',
      addDays(bookingDate, 4),
      `${bookingDate}T11:00`,
      `${bookingDate}T12:00`,
      'approved',
      JSON.stringify([{ capability: 'power-supply', priority: 'must', reason: 'Voltage supply' }]),
      85.0,
      JSON.stringify({ urgency: 80, suitability: 25, fairness: 24, efficiency: 10, total: 85 }),
      userMap['dr.rao@campus.edu'],
      'Approved.'
    );
  }

  // Other historical bookings spread over 30 days to populate oscilloscope high utilisation and 3D printer low utilisation
  const additionalBookings = [
    { daysAgo: 26, studentEmail: 'ravi@campus.edu', equipId: dsoId, hours: 3 },
    { daysAgo: 24, studentEmail: 'meera@campus.edu', equipId: dsoId, hours: 3 },
    { daysAgo: 21, studentEmail: 'ravi@campus.edu', equipId: dsoId, hours: 3 },
    { daysAgo: 19, studentEmail: 'meera@campus.edu', equipId: dsoId, hours: 3 },
    { daysAgo: 16, studentEmail: 'ravi@campus.edu', equipId: dsoId, hours: 3 },
    { daysAgo: 12, studentEmail: 'meera@campus.edu', equipId: dsoId, hours: 3 },
    { daysAgo: 10, studentEmail: 'ravi@campus.edu', equipId: dsoId, hours: 3 },
    { daysAgo: 8,  studentEmail: 'meera@campus.edu', equipId: dsoId, hours: 3 },
    { daysAgo: 6,  studentEmail: 'ravi@campus.edu', equipId: dsoId, hours: 3 },
    { daysAgo: 4,  studentEmail: 'meera@campus.edu', equipId: dsoId, hours: 3 },
    { daysAgo: 2,  studentEmail: 'meera@campus.edu', equipId: dsoId, hours: 3 },
    { daysAgo: 1,  studentEmail: 'meera@campus.edu', equipId: dsoId, hours: 3 },
    // 3D printer: only 1 short session of 2 hours in 30 days (very low utilisation ~5%)
    { daysAgo: 15, studentEmail: 'ravi@campus.edu', equipId: fdmId, hours: 2 },
    // GPU and other items
    { daysAgo: 20, studentEmail: 'meera@campus.edu', equipId: gpuId, hours: 3 },
    { daysAgo: 13, studentEmail: 'meera@campus.edu', equipId: gpuId, hours: 3 },
    { daysAgo: 7,  studentEmail: 'ravi@campus.edu',  equipId: espId, hours: 2 },
    { daysAgo: 3,  studentEmail: 'meera@campus.edu', equipId: rpiId, hours: 2 },
  ];

  for (const b of additionalBookings) {
    const bookingDate = addDays(todayStr, -b.daysAgo);
    insertReq.run(
      userMap[b.studentEmail] || userMap['meera@campus.edu'],
      b.equipId,
      'Historical lab session',
      'Coursework research.',
      addDays(bookingDate, 2),
      `${bookingDate}T13:00`,
      `${bookingDate}T${String(13 + b.hours).padStart(2, '0')}:00`,
      'approved',
      JSON.stringify([]),
      70.0,
      JSON.stringify({ urgency: 70, suitability: 20, fairness: 20, efficiency: 10, total: 70 }),
      userMap['dr.rao@campus.edu'],
      'Approved.'
    );
  }

  // 6. Active Upcoming COMPETING Requests for DEMO (Sections 11, 21.3, 41)
  // Scenario: On Thursday (or 2 days ahead), 100MHz Oscilloscope (quantity 1) slot 14:00 - 16:00 is contested!
  // Competing requests:
  // - Meera: deadline in 2 days (urgent!), 1 prior hour -> Top score ~84 (Recommended Winner!)
  // - Asha: deadline in 6 days, 0 prior hours -> Score ~66
  // - Ravi: deadline in 10 days, 9 prior hours -> Score ~47
  const demoDate = addDays(todayStr, 2);
  const slotStart = `${demoDate}T14:00`;
  const slotEnd = `${demoDate}T16:00`;

  // Competing Request 1: Meera Reddy (Urgent: deadline in 2 days)
  insertReq.run(
    userMap['meera@campus.edu'],
    dsoId,
    'Fast Transient Glitch Analysis for Embedded Security',
    'Investigating side-channel power glitching on cryptographic hardware accelerator. Urgent submission in 2 days.',
    addDays(demoDate, 2),
    slotStart,
    slotEnd,
    'pending',
    JSON.stringify([
      { capability: 'signal-analysis', priority: 'must', reason: 'High-speed analog glitch capture' },
    ]),
    84.3,
    JSON.stringify({
      urgency: 34.3,
      suitability: 25.0,
      fairness: 19.0,
      efficiency: 6.0,
      total: 84.3,
      factors: { deadlineDays: 2, matchedTagsCount: 1, totalRequiredTags: 1, pastAllocatedHours: 1, durationMinutes: 120 },
    }),
    null,
    null
  );

  // Competing Request 2: Asha Sharma (Deadline in 6 days, 0 past hours)
  insertReq.run(
    userMap['asha@campus.edu'],
    dsoId,
    'IoT Soil-Moisture Sensor Signal Debugging',
    'I am building an IoT soil-moisture monitor that sends readings to the cloud over WiFi. I need to debug the analog sensor signal and prototype an enclosure. Due in 6 days.',
    addDays(demoDate, 6),
    slotStart,
    slotEnd,
    'pending',
    JSON.stringify([
      { capability: 'signal-analysis', priority: 'must', reason: 'Analog sensor waveform verification' },
    ]),
    66.2,
    JSON.stringify({
      urgency: 22.8,
      suitability: 25.0,
      fairness: 20.0,
      efficiency: 6.0,
      total: 73.8,
      factors: { deadlineDays: 6, matchedTagsCount: 1, totalRequiredTags: 1, pastAllocatedHours: 0, durationMinutes: 120 },
    }),
    null,
    null
  );

  // Competing Request 3: Ravi Patel (Deadline in 10 days, 9 past hours)
  insertReq.run(
    userMap['ravi@campus.edu'],
    dsoId,
    'Routine Op-Amp Gain Bandwidth Sweep',
    'Extended laboratory characterization of active filter passband.',
    addDays(demoDate, 10),
    slotStart,
    slotEnd,
    'pending',
    JSON.stringify([
      { capability: 'signal-analysis', priority: 'must', reason: 'Filter inspection' },
    ]),
    47.1,
    JSON.stringify({
      urgency: 11.4,
      suitability: 25.0,
      fairness: 5.0,
      efficiency: 6.0,
      total: 47.4,
      factors: { deadlineDays: 10, matchedTagsCount: 1, totalRequiredTags: 1, pastAllocatedHours: 9, durationMinutes: 120 },
    }),
    null,
    null
  );

  // Initial audit log entry
  db.prepare(`
    INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
    VALUES (?, 'SYSTEM_SEED', 'DATABASE', 0, ?)
  `).run(userMap['admin@campus.edu'], 'Seeded Part III Revision 3 inventory, capabilities, and contested scenario.');

  console.log('Database successfully seeded with 3 departments, 14 items, and 15 capabilities!');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
  db.close();
}
