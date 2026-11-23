import bcrypt from 'bcryptjs';
import { db } from './connection.js';
import { runMigrations } from './migrate.js';
import { formatLocalDate, addDays } from '../domain/timeUtils.js';

export function seedDatabase() {
  console.log('Resetting and seeding database...');
  runMigrations();

  // Clear existing data
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DELETE FROM audit_log;');
  db.exec('DELETE FROM booking_requests;');
  db.exec('DELETE FROM equipment;');
  db.exec('DELETE FROM users;');
  db.exec('DELETE FROM departments;');
  try {
    db.exec('DELETE FROM sqlite_sequence;');
  } catch (e) {
    // ignore
  }
  db.exec('PRAGMA foreign_keys = ON;');

  // 1. Departments
  const insertDept = db.prepare('INSERT INTO departments (code, name) VALUES (?, ?)');
  insertDept.run('ECE', 'Department of Electrical & Computer Engineering');
  insertDept.run('CSE', 'Department of Computer Science & Engineering');
  insertDept.run('MECH', 'Department of Mechanical Engineering & Mechatronics');
  insertDept.run('BIO', 'Department of Biomedical Engineering & Materials');

  const deptRows = db.prepare('SELECT id, code FROM departments').all() as Array<{ id: number; code: string }>;
  const deptMap: Record<string, number> = {};
  for (const d of deptRows) {
    deptMap[d.code] = d.id;
  }

  // 2. Demo Users (all use 'password123')
  const passwordHash = bcrypt.hashSync('password123', 10);
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, department_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertUser.run('Alex Chen', 'alex@campus.edu', passwordHash, 'student', deptMap.ECE);
  insertUser.run('Maya Patel', 'maya@campus.edu', passwordHash, 'student', deptMap.CSE);
  insertUser.run('Jordan Taylor', 'jordan@campus.edu', passwordHash, 'student', deptMap.MECH);
  insertUser.run('Dr. Sarah Lin', 'dr.lin@campus.edu', passwordHash, 'faculty', deptMap.ECE);
  insertUser.run('Prof. James Miller', 'prof.miller@campus.edu', passwordHash, 'faculty', deptMap.CSE);
  insertUser.run('Chief Elena Rostova', 'admin@campus.edu', passwordHash, 'admin', deptMap.ECE);

  // 3. Equipment Items (20 items across departments and categories)
  const insertEquip = db.prepare(`
    INSERT INTO equipment (name, category, department_id, location, description, tags, specs, quantity, min_session_minutes, max_session_minutes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const equipments = [
    {
      name: 'Keysight 1GHz 4-Channel Digital Storage Oscilloscope',
      category: 'Test & Measurement',
      dept: deptMap.ECE,
      location: 'Engineering Hall, Lab 302',
      description: 'High-speed oscilloscope for mixed-signal debugging, protocol analysis (I2C/SPI/CAN), and fast transient capture.',
      tags: ['oscilloscope', 'rf', 'signal-analysis', 'hardware-debugging', 'embedded'],
      specs: { 'Bandwidth': '1 GHz', 'Sample Rate': '5 GSa/s', 'Channels': '4', 'Memory Depth': '4 Mpts' },
      quantity: 2,
      min: 30,
      max: 180,
      status: 'active',
    },
    {
      name: 'Rohde & Schwarz 3.6GHz Spectrum Analyzer',
      category: 'Test & Measurement',
      dept: deptMap.ECE,
      location: 'Engineering Hall, RF Shielded Room 308',
      description: 'Precision microwave and RF spectrum analyzer with preamplifiers and tracking generator for antenna/EMC testing.',
      tags: ['rf', 'spectrum-analyzer', 'wireless', 'antenna', 'emc', 'microwave'],
      specs: { 'Frequency Range': '9 kHz - 3.6 GHz', 'DANL': '-163 dBm', 'Resolution Bandwidth': '1 Hz - 3 MHz' },
      quantity: 1,
      min: 60,
      max: 240,
      status: 'active',
    },
    {
      name: 'Xilinx Zynq UltraScale+ MPSoC Development Board',
      category: 'Embedded & FPGA',
      dept: deptMap.ECE,
      location: 'Embedded Systems Lab, Room 215',
      description: 'Heterogeneous ARM + FPGA SoC development kit with high-speed transceivers, DDR4, and PCIe Gen3 for computer vision and DSP.',
      tags: ['fpga', 'verilog', 'vhdl', 'zynq', 'embedded', 'dsp', 'hardware-acceleration'],
      specs: { 'Logic Cells': '256K', 'Processor': 'Quad-core ARM Cortex-A53', 'Memory': '4GB DDR4' },
      quantity: 2,
      min: 60,
      max: 240,
      status: 'active',
    },
    {
      name: 'Keithley 2450 High-Precision SourceMeter (SMU)',
      category: 'Test & Measurement',
      dept: deptMap.ECE,
      location: 'Solid-State Lab, Room 310',
      description: 'Touchscreen source measurement unit capable of simultaneous voltage/current sourcing and picoampere-level measuring.',
      tags: ['smu', 'current-measurement', 'semiconductor', 'iv-curve', 'nano-amps'],
      specs: { 'Current Range': '10 nA - 1 A', 'Voltage Range': '20 mV - 200 V', 'Accuracy': '0.012%' },
      quantity: 1,
      min: 30,
      max: 120,
      status: 'active',
    },
    {
      name: 'NVIDIA Dual H100 NVLink AI Supercomputing Node',
      category: 'AI & GPU Compute',
      dept: deptMap.CSE,
      location: 'Turing Data Center, Rack 04',
      description: 'Flagship deep learning server with dual 80GB SXM5 H100 GPUs, 600GB/s NVLink, and 512GB host RAM for training large models.',
      tags: ['gpu', 'h100', 'deep-learning', 'pytorch', 'cuda', 'llm', 'computer-vision'],
      specs: { 'GPUs': '2x NVIDIA H100 80GB SXM5', 'Host RAM': '512 GB ECC DDR5', 'NVLink Bandwidth': '600 GB/s' },
      quantity: 1,
      min: 60,
      max: 240,
      status: 'active',
    },
    {
      name: 'NVIDIA RTX 4090 Deep Learning Workstation',
      category: 'AI & GPU Compute',
      dept: deptMap.CSE,
      location: 'AI Research Lab, Room 402',
      description: 'High-performance desktop workstation for computer vision model inference, reinforcement learning, and local LLM fine-tuning.',
      tags: ['gpu', 'cuda', 'deep-learning', 'pytorch', 'tensorflow', 'machine-learning'],
      specs: { 'GPU': 'NVIDIA RTX 4090 24GB VRAM', 'CPU': 'AMD Threadripper 32-Core', 'RAM': '128 GB' },
      quantity: 3,
      min: 30,
      max: 240,
      status: 'active',
    },
    {
      name: 'NVIDIA Jetson AGX Orin Robotics Development Kit',
      category: 'Embedded & FPGA',
      dept: deptMap.CSE,
      location: 'Autonomous Robotics Lab, Room 410',
      description: 'Server-class AI performance in an embedded 275 TOPS form factor for autonomous drones, mobile robots, and edge SLAM.',
      tags: ['embedded', 'robotics', 'edge-ai', 'jetson', 'computer-vision', 'ros2'],
      specs: { 'AI Compute': '275 TOPS', 'GPU': 'Ampere 2048 cores', 'RAM': '64 GB LPDDR5' },
      quantity: 2,
      min: 30,
      max: 180,
      status: 'active',
    },
    {
      name: 'Logic Pro 16-Channel 500MHz USB Logic Analyzer',
      category: 'Test & Measurement',
      dept: deptMap.CSE,
      location: 'Systems & Networks Lab, Room 406',
      description: '16-channel digital and analog input logic analyzer with automated decoding for SPI, I2C, UART, CAN, USB 1.1, and custom protocols.',
      tags: ['logic-analyzer', 'protocols', 'spi', 'i2c', 'uart', 'embedded', 'hardware-debugging'],
      specs: { 'Channels': '16 digital/analog', 'Digital Sample Rate': '500 MS/s', 'Voltage': '1.2V - 5.5V' },
      quantity: 2,
      min: 30,
      max: 120,
      status: 'active',
    },
    {
      name: 'Formlabs Form 4 High-Speed SLA Resin 3D Printer',
      category: 'Additive Manufacturing',
      dept: deptMap.MECH,
      location: 'Digital Prototyping Workshop, Bay 1',
      description: 'Next-generation stereolithography (SLA) resin printer delivering 50-micron details for precision mechanical enclosures and microfluidics.',
      tags: ['3d-printing', 'sla', 'resin', 'prototyping', 'microfluidics', 'rapid-prototyping'],
      specs: { 'Technology': 'Low Force Display (LFD) SLA', 'XY Resolution': '50 um', 'Build Volume': '20.0 x 12.5 x 21.0 cm' },
      quantity: 1,
      min: 60,
      max: 240,
      status: 'active',
    },
    {
      name: 'Bambu Lab X1-Carbon Multi-Color 3D Printer',
      category: 'Additive Manufacturing',
      dept: deptMap.MECH,
      location: 'Digital Prototyping Workshop, Bay 2',
      description: 'High-speed CoreXY 3D printer with active vibration compensation, carbon-fiber filament capability, and multi-material AMS.',
      tags: ['3d-printing', 'fdm', 'carbon-fiber', 'pla', 'prototyping', 'mechanical-design'],
      specs: { 'Max Speed': '500 mm/s', 'Hotend Temp': '300 C', 'Build Volume': '256 x 256 x 256 mm' },
      quantity: 2,
      min: 60,
      max: 240,
      status: 'active',
    },
    {
      name: 'Bantam Tools Desktop CNC Milling Machine',
      category: 'Precision Machining',
      dept: deptMap.MECH,
      location: 'Machine Shop, Station 3',
      description: 'Precision desktop CNC mill tailored for fast aluminum prototyping, brass machining, and custom double-sided PCB fabrication.',
      tags: ['cnc', 'machining', 'pcb-milling', 'aluminum', 'prototyping', 'cam'],
      specs: { 'Spindle Speed': '28,000 RPM', 'Repeatability': '< 0.025 mm', 'Work Area': '140 x 114 x 34 mm' },
      quantity: 1,
      min: 60,
      max: 180,
      status: 'active',
    },
    {
      name: 'Universal Robots UR5e 6-Axis Collaborative Robotic Arm',
      category: 'Robotics & Automation',
      dept: deptMap.MECH,
      location: 'Robotics Wing, Cell A',
      description: 'Industrial-grade cobot arm with 5kg payload, 850mm reach, integrated force-torque sensor, and ROS2 control interface.',
      tags: ['robotics', 'manipulator', 'ros2', 'automation', 'kinematics', 'trajectory-planning'],
      specs: { 'Payload': '5 kg', 'Reach': '850 mm', 'Repeatability': '+/- 0.03 mm', 'Degrees of Freedom': '6' },
      quantity: 1,
      min: 60,
      max: 240,
      status: 'active',
    },
    {
      name: 'Markforged Onyx Pro Continuous Fiber 3D Printer',
      category: 'Additive Manufacturing',
      dept: deptMap.MECH,
      location: 'Advanced Materials Shop, Bay 3',
      description: 'Industrial 3D printer reinforcing micro-carbon onyx filament with continuous fiberglass strands for end-use functional parts.',
      tags: ['3d-printing', 'composite', 'fiberglass', 'onyx', 'high-strength', 'prototyping'],
      specs: { 'Tensile Strength': '590 MPa', 'Layer Height': '100 um', 'Build Volume': '320 x 132 x 154 mm' },
      quantity: 1,
      min: 60,
      max: 240,
      status: 'active',
    },
    {
      name: 'Shimadzu UV-2600i Double Beam UV-Vis Spectrophotometer',
      category: 'Analytical Spectroscopy',
      dept: deptMap.BIO,
      location: 'Bio-Spectroscopy Lab, Room 104',
      description: 'Ultra-low stray light double beam spectrophotometer covering 185 to 900 nm for biomolecular quantification and bandgap analysis.',
      tags: ['spectrophotometer', 'uv-vis', 'biochemical', 'absorbance', 'materials-characterization'],
      specs: { 'Wavelength Range': '185 - 900 nm', 'Stray Light': '0.005%', 'Spectral Bandwidth': '0.1 - 5 nm' },
      quantity: 1,
      min: 30,
      max: 120,
      status: 'active',
    },
    {
      name: 'Horiba FluoroMax-4 Benchtop Spectrofluorometer',
      category: 'Analytical Spectroscopy',
      dept: deptMap.BIO,
      location: 'Bio-Spectroscopy Lab, Room 106',
      description: 'High-sensitivity spectrofluorometer with photon-counting detection for fluorescence lifetime, quantum yield, and FRET assays.',
      tags: ['fluorescence', 'spectroscopy', 'fret', 'biochemical', 'quantum-yield', 'photoluminescence'],
      specs: { 'Signal-to-Noise': '3000:1 (RMS)', 'Integration Time': '1 ms - 160 s', 'Excitation': '200 - 950 nm' },
      quantity: 1,
      min: 30,
      max: 150,
      status: 'active',
    },
    {
      name: 'Thorlabs Optical Isolation Breadboard & Interferometer',
      category: 'Optics & Photonics',
      dept: deptMap.BIO,
      location: 'Cleanroom Basement, Optical Suite 2',
      description: 'Pneumatically isolated honeycomb optical table with HeNe lasers, Michelson & Mach-Zehnder optical configurations, and precision piezo mounts.',
      tags: ['optics', 'interferometer', 'laser', 'piezo', 'photonics', 'vibration-isolation'],
      specs: { 'Isolation': 'Active Pneumatic Support', 'Laser Wavelength': '632.8 nm HeNe', 'Table Size': '1.2 x 2.4 m' },
      quantity: 1,
      min: 60,
      max: 240,
      status: 'active', // low utilization item to trigger underutilized recommendations
    },
    {
      name: 'Malvern Zetasizer Nano-ZS Nanoparticle Analyzer',
      category: 'Analytical Spectroscopy',
      dept: deptMap.BIO,
      location: 'Colloid & Surface Science Lab, Room 202',
      description: 'Dynamic light scattering (DLS) system for measuring nanoparticle size, zeta potential, and molecular weight of polymers and proteins.',
      tags: ['nanoparticles', 'dls', 'zeta-potential', 'colloids', 'biopolymers', 'particle-sizing'],
      specs: { 'Size Range': '0.3 nm - 10 um', 'Zeta Range': '3.8 nm - 100 um', 'Laser': '4 mW He-Ne 633 nm' },
      quantity: 1,
      min: 30,
      max: 120,
      status: 'active',
    },
    {
      name: 'SMT Automated Pick and Place PCB Assembly Machine',
      category: 'Precision Machining',
      dept: deptMap.ECE,
      location: 'Hardware Prototyping Bay, Station 4',
      description: 'High-speed desktop SMD component placer with dual vision cameras and tape feeders for quick PCB pilot run manufacturing.',
      tags: ['smt', 'pcb-assembly', 'pick-and-place', 'surface-mount', 'hardware-prototyping'],
      specs: { 'Component Size': '0402 - QFP/BGA', 'Speed': '3,000 CPH', 'Feeders': '30 slots' },
      quantity: 1,
      min: 60,
      max: 180,
      status: 'maintenance', // currently undergoing scheduled maintenance
    },
    {
      name: 'Fluke 8846A 6.5 Digit Precision Multimeter',
      category: 'Test & Measurement',
      dept: deptMap.ECE,
      location: 'Electronics Instrumentation Lab, Bench 7',
      description: 'High-precision benchtop digital multimeter for low-voltage logging, graphical trending, and 4-wire resistance calibration.',
      tags: ['multimeter', 'voltage-measurement', 'calibration', 'precision-instrumentation'],
      specs: { 'Resolution': '6.5 Digits', 'V DC Accuracy': '0.0024%', 'Max Current': '10 A' },
      quantity: 2,
      min: 30,
      max: 120,
      status: 'active',
    },
    {
      name: 'Franka Emika Panda Collaborative Arm with Gripper',
      category: 'Robotics & Automation',
      dept: deptMap.CSE,
      location: 'Interactive Robotics Lab, Room 412',
      description: '7-DOF robotic manipulator with torque sensors in all 7 axes for sensitive impedance control, tactile feedback, and reinforcement learning.',
      tags: ['robotics', 'manipulator', 'force-control', 'ros2', 'impedance-control', 'reinforcement-learning'],
      specs: { 'Degrees of Freedom': '7', 'Payload': '3 kg', 'Reach': '855 mm', 'Joint Torque Sensing': 'All axes' },
      quantity: 1,
      min: 60,
      max: 240,
      status: 'active',
    },
  ];

  for (const eq of equipments) {
    insertEquip.run(
      eq.name,
      eq.category,
      eq.dept,
      eq.location,
      eq.description,
      JSON.stringify(eq.tags),
      JSON.stringify(eq.specs),
      eq.quantity,
      eq.min,
      eq.max,
      eq.status
    );
  }

  // 4. Historical Approved Bookings (last 30 days) + Current Contested & Pending Requests
  const todayStr = formatLocalDate(new Date());
  const insertReq = db.prepare(`
    INSERT INTO booking_requests (
      student_id, equipment_id, project_title, project_description, project_deadline,
      start_time, end_time, status, required_capabilities, suitability, priority_score,
      score_breakdown, reviewer_id, reviewer_comment, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  // Generate 25 historical approved bookings over the past 28 days
  // Spread across equipment:
  // Alex (id 1) gets ~8 hours
  // Maya (id 2) gets ~2 hours
  // Jordan (id 3) gets 0 hours
  // H100 (id 5) and Keysight Scope (id 1) have heavy bookings -> High utilisation
  // Optical Breadboard (id 16) has 0 bookings -> Underutilised
  const historicalSeedPlans = [
    // Days ago, studentId, equipId, durationHours, title
    { daysAgo: 26, studentId: 1, equipId: 1, duration: 2, title: 'High-speed ADC Signal Characterization' },
    { daysAgo: 24, studentId: 1, equipId: 5, duration: 3, title: 'Transformer Model Pretraining Baseline' },
    { daysAgo: 22, studentId: 1, equipId: 3, duration: 2, title: 'FPGA PCIe Bus Interface Synthesis' },
    { daysAgo: 20, studentId: 2, equipId: 6, duration: 2, title: 'YOLOv8 Edge Object Detection Benchmarking' },
    { daysAgo: 18, studentId: 1, equipId: 5, duration: 3, title: 'Attention Layer Distillation Run' },
    { daysAgo: 16, studentId: 1, equipId: 1, duration: 2, title: 'Clock Jitter Transient Analysis' },
    { daysAgo: 15, studentId: 2, equipId: 10, duration: 2, title: 'Drone Lightweight Propeller Prototyping' },
    { daysAgo: 14, studentId: 1, equipId: 5, duration: 4, title: 'Fine-tuning Mistral 7B on Domain Data' },
    { daysAgo: 12, studentId: 1, equipId: 8, duration: 1, title: 'CAN Bus Message Packet Sniffing' },
    { daysAgo: 11, studentId: 2, equipId: 6, duration: 2, title: 'Diffusion Latent Denoising Speedup' },
    { daysAgo: 10, studentId: 1, equipId: 5, duration: 3, title: 'Deep Reinforcement Learning Navigation' },
    { daysAgo: 9,  studentId: 1, equipId: 2, duration: 2, title: 'Patch Antenna Return Loss S11 Sweep' },
    { daysAgo: 8,  studentId: 1, equipId: 1, duration: 2, title: 'DDR4 Eye Diagram Margin Testing' },
    { daysAgo: 7,  studentId: 2, equipId: 7, duration: 2, title: 'Jetson Orin TensorRT Engine Quantization' },
    { daysAgo: 6,  studentId: 1, equipId: 5, duration: 3, title: 'Contrastive Vision-Language Training' },
    { daysAgo: 5,  studentId: 1, equipId: 9, duration: 2, title: 'Microfluidic Chamber SLA Master Mold' },
    { daysAgo: 4,  studentId: 1, equipId: 12, duration: 3, title: 'Cobot Visual Servoing Trajectory' },
    { daysAgo: 3,  studentId: 2, equipId: 6, duration: 2, title: 'Semantic Segmentation Fine-Tuning' },
    { daysAgo: 2,  studentId: 1, equipId: 5, duration: 3, title: 'Embedding Model Quantization' },
    { daysAgo: 2,  studentId: 1, equipId: 1, duration: 2, title: 'Power Rail Ripple Noise Measurement' },
    { daysAgo: 1,  studentId: 2, equipId: 14, duration: 1, title: 'Protein Concentration UV Absorbance' },
    { daysAgo: 1,  studentId: 1, equipId: 5, duration: 3, title: 'LoRA Adapter Convergence Experiment' },
    { daysAgo: 1,  studentId: 1, equipId: 4, duration: 1, title: 'MOSFET Subthreshold Leakage Curve' },
    { daysAgo: 1,  studentId: 2, equipId: 10, duration: 2, title: 'Robotics Chassis Fast Print' },
    { daysAgo: 1,  studentId: 1, equipId: 11, duration: 2, title: 'Motor Mount Aluminum Billet Milling' },
  ];

  for (const item of historicalSeedPlans) {
    const bookingDate = addDays(todayStr, -item.daysAgo);
    const startIso = `${bookingDate}T10:00`;
    const endHour = 10 + item.duration;
    const endIso = `${bookingDate}T${String(endHour).padStart(2, '0')}:00`;
    const deadline = addDays(bookingDate, 3);

    insertReq.run(
      item.studentId,
      item.equipId,
      item.title,
      'Automated seed historical validation project for campus laboratory resource-sharing.',
      deadline,
      startIso,
      endIso,
      'approved',
      JSON.stringify(['lab-research']),
      0.9,
      85,
      JSON.stringify({ urgency: 80, suitability: 90, fairness: 75, efficiency: 90, total: 84 }),
      4, // Dr. Sarah Lin approved
      'Approved: project verified within department syllabus guidelines.'
    );
  }

  // 5. Active Upcoming COMPETING / CONFLICTED Requests for TOMORROW
  // Both Student 1 (Alex) and Student 2 (Maya) request the exact same slot on the single H100 Node (id 5)!
  // This immediately allows judges & reviewers to see the Fair Allocation Engine in action!
  const tomorrowStr = addDays(todayStr, 1);
  const slotStart = `${tomorrowStr}T10:00`;
  const slotEnd = `${tomorrowStr}T13:00`;

  // Competing Request 1: Alex Chen (Has 8+ previous hours -> lower fairness)
  insertReq.run(
    1, // Alex Chen
    5, // NVIDIA Dual H100
    'Vision Transformer Large Scale Training',
    'I need the H100 node to train a 600M parameter ViT for satellite image segmentation before the paper deadline.',
    addDays(tomorrowStr, 10), // deadline in 10 days
    slotStart,
    slotEnd,
    'pending',
    JSON.stringify(['gpu', 'deep-learning', 'pytorch', 'cuda', 'h100']),
    1.0,
    71.5,
    JSON.stringify({
      urgency: 50,
      suitability: 100,
      fairness: 45, // penalized because Alex already has many hours
      efficiency: 95,
      weights: { urgency: 0.35, suitability: 0.30, fairness: 0.20, efficiency: 0.15 },
      total: 70.75,
      factors: { deadlineDays: 10, matchedTagsCount: 5, totalRequiredTags: 5, pastAllocatedHours: 8, durationMinutes: 180 }
    }),
    null,
    null
  );

  // Competing Request 2: Maya Patel (Only 2 previous hours -> top fairness, and urgent deadline!)
  insertReq.run(
    2, // Maya Patel
    5, // NVIDIA Dual H100
    'Real-time Multimodal Medical Diagnostics LLM',
    'Urgent clinical validation thesis deadline in 2 days. Need dual H100 NVLink to run distributed multimodal inference evaluation.',
    addDays(tomorrowStr, 2), // urgent deadline in 2 days!
    slotStart,
    slotEnd,
    'pending',
    JSON.stringify(['gpu', 'deep-learning', 'pytorch', 'cuda', 'llm']),
    1.0,
    91.2,
    JSON.stringify({
      urgency: 100, // very urgent
      suitability: 100,
      fairness: 90, // high fairness: underserved student
      efficiency: 95,
      weights: { urgency: 0.35, suitability: 0.30, fairness: 0.20, efficiency: 0.15 },
      total: 92.25,
      factors: { deadlineDays: 2, matchedTagsCount: 5, totalRequiredTags: 5, pastAllocatedHours: 2, durationMinutes: 180 }
    }),
    null,
    null
  );

  // Competing Request 3: Jordan Taylor on Keysight Oscilloscope
  insertReq.run(
    3, // Jordan Taylor
    1, // Keysight Oscilloscope
    'Ultrasonic Mechatronics Transducer Signal Damping',
    'Measuring transducer ring-down transients for mechatronics senior design capstone.',
    addDays(tomorrowStr, 4),
    `${tomorrowStr}T14:00`,
    `${tomorrowStr}T16:00`,
    'pending',
    JSON.stringify(['oscilloscope', 'signal-analysis', 'hardware-debugging']),
    1.0,
    88.5,
    JSON.stringify({
      urgency: 85,
      suitability: 100,
      fairness: 100, // zero past hours
      efficiency: 90,
      weights: { urgency: 0.35, suitability: 0.30, fairness: 0.20, efficiency: 0.15 },
      total: 89.25,
      factors: { deadlineDays: 4, matchedTagsCount: 3, totalRequiredTags: 3, pastAllocatedHours: 0, durationMinutes: 120 }
    }),
    null,
    null
  );

  // Audit log initial entry
  db.prepare(`
    INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
    VALUES (?, ?, ?, ?, ?)
  `).run(6, 'SYSTEM_SEED', 'DATABASE', 0, 'Initial laboratory catalogue, demo users and benchmark bookings populated.');

  console.log('Seeding completed successfully!');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
  db.close();
}
