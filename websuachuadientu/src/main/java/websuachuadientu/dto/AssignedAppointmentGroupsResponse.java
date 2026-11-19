package websuachuadientu.dto;

import java.util.List;

public record AssignedAppointmentGroupsResponse(
        List<AssignedAppointmentResponse> actionRequired,
        List<AssignedAppointmentResponse> received,
        List<AssignedAppointmentResponse> other
) {}
