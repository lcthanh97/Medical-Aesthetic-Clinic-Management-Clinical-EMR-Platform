import { prisma } from '@/infrastructure/database/prisma';
import type { IVisitsRepository, DirectVisitInput, VisitFilter } from '@/server/repositories/IVisitsRepository';

export class PrismaVisitsRepository implements IVisitsRepository {
  async createDirectVisit(input: DirectVisitInput): Promise<{ visit: any; queueNumber: number }> {
    return prisma.$transaction(async (tx) => {
      const startOfDay = new Date(input.visitDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(input.visitDate);
      endOfDay.setHours(23, 59, 59, 999);

      // 1. Tính toán số thứ tự theo roomId trong ngày (Concurrency-safe within transaction)
      const count = await tx.visit.count({
        where: {
          roomId: input.roomId,
          visitDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const queueNumber = count + 1;

      // 2. Tạo bản ghi Visit
      const createdVisit = await tx.visit.create({
        data: {
          patientId: input.patientId,
          roomId: input.roomId,
          visitDate: input.visitDate,
          status: input.status,
          medicalRecord: {
            create: {
              notes: JSON.stringify({
                reason: input.reason,
                receptionNote: input.receptionNote || '',
                visitType: input.visitType || 'NEW',
                queueNumber,
              }),
            },
          },
        },
        include: {
          patient: true,
          room: {
            include: {
              department: true,
            },
          },
          medicalRecord: true,
        },
      });

      return {
        visit: {
          ...createdVisit,
          queueNumber,
        },
        queueNumber,
      };
    });
  }

  async findById(id: string): Promise<any | null> {
    return prisma.visit.findUnique({
      where: { id },
      include: {
        patient: true,
        room: {
          include: {
            department: true,
          },
        },
        medicalRecord: true,
      },
    });
  }

  async findMany(filter?: VisitFilter): Promise<{ items: any[]; total: number }> {
    const where: any = {};

    if (filter?.date) {
      const startOfDay = new Date(filter.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filter.date);
      endOfDay.setHours(23, 59, 59, 999);

      where.visitDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (filter?.roomId) {
      where.roomId = filter.roomId;
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.search) {
      const q = filter.search.trim();
      where.patient = {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { patientCode: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      };
    }

    const page = filter?.page && filter.page > 0 ? Number(filter.page) : 1;
    const limit = filter?.limit && filter.limit > 0 ? Number(filter.limit) : 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.visit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { visitDate: 'desc' },
        include: {
          patient: true,
          room: {
            include: {
              department: true,
            },
          },
          medicalRecord: true,
        },
      }),
      prisma.visit.count({ where }),
    ]);

    return { items, total };
  }

  async getQueue(roomId?: string, date?: Date, status?: string): Promise<any[]> {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
      visitDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    if (roomId) {
      where.roomId = roomId;
    }

    if (status) {
      where.status = status;
    } else {
      // Mặc định hiển thị các ca đang chờ hoặc đang khám trước
      where.status = {
        in: ['WAITING', 'EXAMINING', 'COMPLETED', 'CANCELLED'],
      };
    }

    return prisma.visit.findMany({
      where,
      orderBy: [
        { visitDate: 'asc' },
      ],
      include: {
        patient: true,
        room: {
          include: {
            department: true,
          },
        },
        medicalRecord: true,
      },
    });
  }

  async getQueueSummary(date?: Date): Promise<{
    totalVisits: number;
    waitingCount: number;
    examiningCount: number;
    completedCount: number;
  }> {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const visits = await prisma.visit.findMany({
      where: {
        visitDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { status: true },
    });

    const totalVisits = visits.length;
    const waitingCount = visits.filter((v) => v.status === 'WAITING').length;
    const examiningCount = visits.filter((v) => v.status === 'EXAMINING').length;
    const completedCount = visits.filter((v) => v.status === 'COMPLETED').length;

    return {
      totalVisits,
      waitingCount,
      examiningCount,
      completedCount,
    };
  }

  async getRoomsWithWaitingCount(): Promise<any[]> {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const rooms = await prisma.room.findMany({
      include: {
        department: true,
        visits: {
          where: {
            visitDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
            status: 'WAITING',
          },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return rooms.map((r) => ({
      id: r.id,
      name: r.name,
      departmentId: r.departmentId,
      departmentName: r.department?.name,
      waitingCount: r.visits.length,
    }));
  }

  async findPatientActiveVisit(patientId: string, date: Date): Promise<any | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.visit.findFirst({
      where: {
        patientId,
        visitDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['WAITING', 'EXAMINING'],
        },
      },
      include: {
        room: true,
      },
    });
  }

  async findRoomById(roomId: string): Promise<any | null> {
    return prisma.room.findUnique({
      where: { id: roomId },
      include: { department: true },
    });
  }

  async transferRoom(visitId: string, targetRoomId: string, reason?: string): Promise<any> {
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: { medicalRecord: true },
    });

    let currentNotes: any = {};
    if (visit?.medicalRecord?.notes) {
      try {
        currentNotes = JSON.parse(visit.medicalRecord.notes);
      } catch {
        currentNotes = { text: visit.medicalRecord.notes };
      }
    }
    currentNotes.transferredFromRoom = visit?.roomId;
    currentNotes.transferReason = reason || 'Điều chuyển phòng khám';

    return prisma.visit.update({
      where: { id: visitId },
      data: {
        roomId: targetRoomId,
        medicalRecord: {
          update: {
            notes: JSON.stringify(currentNotes),
          },
        },
      },
      include: {
        patient: true,
        room: {
          include: {
            department: true,
          },
        },
        medicalRecord: true,
      },
    });
  }

  async cancelVisit(visitId: string, reason?: string): Promise<any> {
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: { medicalRecord: true },
    });

    let currentNotes: any = {};
    if (visit?.medicalRecord?.notes) {
      try {
        currentNotes = JSON.parse(visit.medicalRecord.notes);
      } catch {
        currentNotes = { text: visit.medicalRecord.notes };
      }
    }
    currentNotes.cancelReason = reason || 'Lễ tân hủy lượt khám';

    return prisma.visit.update({
      where: { id: visitId },
      data: {
        status: 'CANCELLED',
        medicalRecord: {
          update: {
            notes: JSON.stringify(currentNotes),
          },
        },
      },
      include: {
        patient: true,
        room: {
          include: {
            department: true,
          },
        },
        medicalRecord: true,
      },
    });
  }

  async createAudit(data: { action: string; entity: string; entityId: string; accountId?: string }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          accountId: data.accountId || null,
        },
      });
    } catch (err) {
      console.warn('AuditLog creation ignored:', err);
    }
  }
}

