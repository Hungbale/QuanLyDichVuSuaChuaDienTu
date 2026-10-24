package websuachuadientu.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Arrays;

/** Allowed repair progress values accepted by write APIs. */
public enum RepairTicketStatus {
    SCHEDULED("SCHEDULED"),
    RECEIVED("RECEIVED"),
    DIAGNOSING("Đang kiểm tra"),
    WAITING_FOR_QUOTE_APPROVAL("Chờ xác nhận báo giá"),
    REPAIRING("Đang sửa"),
    IN_PROGRESS("IN_PROGRESS"),
    WAITING_FOR_PARTS("Chờ linh kiện"),
    CANNOT_BE_REPAIRED("Không thể sửa"),
    CUSTOMER_DECLINED("Khách từ chối"),
    COMPLETED("COMPLETED", "Hoàn thành"),
    CANCELLED("CANCELLED");

    private final String storedValue;
    private final String[] aliases;

    RepairTicketStatus(String storedValue, String... aliases) {
        this.storedValue = storedValue;
        this.aliases = aliases;
    }

    public String storedValue() {
        return storedValue;
    }

    public boolean canTransitionTo(RepairTicketStatus next) {
        return switch (this) {
            case SCHEDULED -> next == DIAGNOSING
                    || next == RECEIVED
                    || next == WAITING_FOR_QUOTE_APPROVAL
                    || next == CANCELLED;
            case RECEIVED -> next == DIAGNOSING || next == CANCELLED;
            case DIAGNOSING -> next == WAITING_FOR_QUOTE_APPROVAL
                    || next == REPAIRING
                    || next == WAITING_FOR_PARTS
                    || next == CANNOT_BE_REPAIRED
                    || next == CANCELLED;
            case WAITING_FOR_QUOTE_APPROVAL -> next == REPAIRING
                    || next == CUSTOMER_DECLINED;
            case REPAIRING, IN_PROGRESS -> next == WAITING_FOR_PARTS
                    || next == COMPLETED
                    || next == CANNOT_BE_REPAIRED;
            case WAITING_FOR_PARTS -> next == REPAIRING
                    || next == CANNOT_BE_REPAIRED;
            case CANNOT_BE_REPAIRED, CUSTOMER_DECLINED, COMPLETED, CANCELLED -> false;
        };
    }

    @JsonCreator
    public static RepairTicketStatus fromValue(String value) {
        if (value == null) {
            return null;
        }
        return Arrays.stream(values())
                .filter(status -> status.name().equalsIgnoreCase(value.trim())
                        || status.storedValue.equalsIgnoreCase(value.trim())
                        || Arrays.stream(status.aliases).anyMatch(alias -> alias.equalsIgnoreCase(value.trim())))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported repair ticket status: " + value));
    }
}
