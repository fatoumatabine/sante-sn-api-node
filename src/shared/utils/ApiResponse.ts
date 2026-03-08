export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export class ApiResponse {
  static success(data: any, message: string = 'Succès') {
    return {
      success: true,
      message,
      data,
    };
  }

  static error(message: string, errors?: any, statusCode: number = 500) {
    return {
      success: false,
      message,
      errors,
    };
  }

  static paginated(data: any[], total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);
    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  static created(data: any, message: string = 'Ressource créée') {
    return {
      success: true,
      message,
      data,
    };
  }

  static noContent(message: string = 'Aucune contenu') {
    return {
      success: true,
      message,
    };
  }
}
