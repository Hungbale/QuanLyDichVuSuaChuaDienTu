package websuachuadientu.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
public class AppointmentRequest {

    @NotBlank
    @Size(max = 200)
    private String device;

    @NotNull
    private Long serviceId;

    @NotNull
    @FutureOrPresent
    private LocalDate appointmentDate;

    @NotNull
    private LocalTime appointmentTime;

    @NotBlank
    @Pattern(regexp = "STORE_DROP_OFF|HOME_PICKUP")
    private String serviceMethod;

    @NotBlank
    @Pattern(regexp = "^0[0-9]{9}$")
    private String contactPhone;

    @NotBlank
    @Size(max = 5000)
    private String problemDescription;

    @Size(max = 500)
    private String pickupAddress;
}
