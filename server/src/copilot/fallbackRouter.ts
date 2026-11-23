import { COPILOT_TOOLS, CopilotUserContext } from './toolRegistry.js';
import { db } from '../db/connection.js';

export interface FallbackRouteResult {
  reply: string;
  cards: any[];
  toolTraces: Array<{ toolName: string; input: any; output: any }>;
}

export async function routeFallbackIntent(
  userMessage: string,
  context: CopilotUserContext
): Promise<FallbackRouteResult> {
  const text = userMessage.toLowerCase().trim();
  const traces: Array<{ toolName: string; input: any; output: any }> = [];
  const cards: any[] = [];

  // Intent 1: Check Availability
  if (
    text.includes('available') ||
    text.includes('availability') ||
    text.includes('free slot') ||
    text.includes('when can i use')
  ) {
    // Find matching equipment name or category in query
    let matchedEquip: any = null;
    const allEquip = db.prepare('SELECT id, slug, name, category FROM equipment').all() as any[];

    for (const eq of allEquip) {
      if (
        text.includes(eq.slug.toLowerCase()) ||
        text.includes(eq.name.toLowerCase()) ||
        (eq.family && text.includes(eq.family.toLowerCase()))
      ) {
        matchedEquip = eq;
        break;
      }
    }

    if (!matchedEquip) {
      if (text.includes('scope') || text.includes('oscilloscope')) {
        matchedEquip = allEquip.find(e => e.slug.includes('scope') || e.name.includes('Oscilloscope'));
      } else if (text.includes('esp32') || text.includes('iot')) {
        matchedEquip = allEquip.find(e => e.slug.includes('esp32'));
      } else if (text.includes('printer') || text.includes('3d')) {
        matchedEquip = allEquip.find(e => e.slug.includes('3d-printer'));
      } else if (text.includes('gpu')) {
        matchedEquip = allEquip.find(e => e.slug.includes('gpu'));
      } else {
        matchedEquip = allEquip[0]; // fallback to first item
      }
    }

    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const availTool = COPILOT_TOOLS.check_availability;
    const availRes = await availTool.execute({ equipmentId: matchedEquip.id, date: tomorrow }, context);

    traces.push({
      toolName: 'check_availability',
      input: { equipmentId: matchedEquip.id, date: tomorrow },
      output: availRes,
    });

    cards.push({
      type: 'availability_card',
      data: {
        equipmentName: matchedEquip.name,
        equipmentSlug: matchedEquip.slug,
        date: tomorrow,
        isOpen: availRes.isOpen,
        availableTimes: availRes.availableTimes,
        contestedTimes: availRes.contestedTimes,
      },
    });

    let reply = `Here is the operating schedule for **${matchedEquip.name}** for tomorrow (${tomorrow}).\n\n`;
    if (availRes.availableTimes && availRes.availableTimes.length > 0) {
      reply += `Currently available time slots: **${availRes.availableTimes.slice(0, 6).join(', ')}** (09:00 - 17:00 operating window).`;
    } else {
      reply += `No free slots open tomorrow. Would you like me to check compatible substitute instruments or subsequent dates?`;
    }

    return { reply, cards, toolTraces: traces };
  }

  // Intent 2: Substitutes & Alternatives
  if (
    text.includes('instead') ||
    text.includes('substitute') ||
    text.includes('alternative') ||
    text.includes('what else can i use')
  ) {
    let matchedEquip: any = null;
    const allEquip = db.prepare('SELECT id, slug, name FROM equipment').all() as any[];
    for (const eq of allEquip) {
      if (text.includes(eq.slug.toLowerCase()) || text.includes(eq.name.toLowerCase())) {
        matchedEquip = eq;
        break;
      }
    }
    if (!matchedEquip) {
      matchedEquip = allEquip[0]; // default to DSO
    }

    const subTool = COPILOT_TOOLS.find_substitutes;
    const subRes = await subTool.execute({ equipmentId: matchedEquip.id }, context);

    traces.push({
      toolName: 'find_substitutes',
      input: { equipmentId: matchedEquip.id },
      output: subRes,
    });

    cards.push({
      type: 'substitutes_card',
      data: subRes,
    });

    const reply = `I found **${subRes.substitutes.length} technically compatible substitute(s)** for **${matchedEquip.name}**. Review their compatibility score and limitations above.`;
    return { reply, cards, toolTraces: traces };
  }

  // Intent 3: My Requests / Status
  if (
    text.includes('my request') ||
    text.includes('booking status') ||
    text.includes('check my booking') ||
    text.includes('track request')
  ) {
    const reqTool = COPILOT_TOOLS.get_my_requests;
    const reqRes = await reqTool.execute({}, context);

    traces.push({
      toolName: 'get_my_requests',
      input: {},
      output: reqRes,
    });

    cards.push({
      type: 'request_status_card',
      data: { requests: reqRes },
    });

    const reply = reqRes.length > 0
      ? `You have **${reqRes.length} recent laboratory reservation request(s)** on file. View their live status above.`
      : `You do not have any pending or confirmed booking requests. Use the Explorer or Matchmaker to reserve laboratory equipment.`;

    return { reply, cards, toolTraces: traces };
  }

  // Intent 4: Project Matchmaker & Planning
  if (
    text.includes('need for') ||
    text.includes('help me plan') ||
    text.includes('project') ||
    text.includes('iot') ||
    text.includes('agriculture') ||
    text.includes('robot') ||
    text.includes('vision') ||
    text.includes('prototype')
  ) {
    const matchTool = COPILOT_TOOLS.match_project_requirements;
    const planRes = await matchTool.execute({ projectDescription: userMessage }, context);

    traces.push({
      toolName: 'match_project_requirements',
      input: { projectDescription: userMessage },
      output: planRes,
    });

    cards.push({
      type: 'prototype_plan_card',
      data: planRes,
    });

    const reply = `I analyzed your project concept and generated a **Structured Prototype Plan** with **${planRes.coveragePercentage}% campus inventory coverage**. I found **${planRes.recommendedEquipment.length} verified laboratory resource(s)** matching your requirements.`;
    return { reply, cards, toolTraces: traces };
  }

  // Intent 5: Prepare Booking Proposal
  if (
    text.includes('book') ||
    text.includes('reserve') ||
    text.includes('schedule session')
  ) {
    const allEquip = db.prepare('SELECT id, slug, name FROM equipment').all() as any[];
    let matched = allEquip[0];
    for (const eq of allEquip) {
      if (text.includes(eq.slug.toLowerCase()) || text.includes(eq.name.toLowerCase())) {
        matched = eq;
        break;
      }
    }

    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const proposalTool = COPILOT_TOOLS.prepare_booking_proposal;
    const proposalRes = await proposalTool.execute({
      equipmentId: matched.id,
      date: tomorrow,
      startTime: '10:00',
      durationMinutes: 120,
      projectTitle: 'Laboratory Research Session',
      projectDescription: 'Session prepared with LabLink Copilot guidance.',
    }, context);

    traces.push({
      toolName: 'prepare_booking_proposal',
      input: { equipmentId: matched.id, date: tomorrow, startTime: '10:00' },
      output: proposalRes,
    });

    cards.push({
      type: 'booking_proposal_card',
      data: proposalRes.proposal,
    });

    const reply = `I have prepared a reservation proposal for **${matched.name}** for tomorrow at 10:00 (120 minutes). In accordance with LabLink safety protocols, Copilot does not book equipment autonomously. Please click **Confirm Reservation** on the proposal card above to submit your request.`;
    return { reply, cards, toolTraces: traces };
  }

  // Default: Search catalogue & General Assistant
  const searchTool = COPILOT_TOOLS.search_equipment;
  const searchRes = await searchTool.execute({ query: userMessage }, context);

  traces.push({
    toolName: 'search_equipment',
    input: { query: userMessage },
    output: searchRes,
  });

  cards.push({
    type: 'equipment_list_card',
    data: { items: searchRes },
  });

  const reply = `Hello ${context.userName}! I am **LabLink Copilot**, your campus laboratory resource assistant. I can help you check real hardware availability, analyze your project requirements, find substitute equipment, or prepare booking requests. Here are relevant resources from our campus catalogue:`;

  return { reply, cards, toolTraces: traces };
}
