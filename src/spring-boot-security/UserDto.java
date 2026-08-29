package com.sevacare.security;

public class UserDto {
    private String id;
    private String name;
    private String phone;
    private String email;
    private String role;
    private String status;

    public UserDto() {}

    public static UserDto from(User user) {
        UserDto dto = new UserDto();
        dto.id = user.getId();
        dto.name = user.getName();
        dto.phone = user.getPhone();
        dto.email = user.getEmail();
        dto.role = user.getRole().name();
        dto.status = user.getStatus().name();
        return dto;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getPhone() { return phone; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getStatus() { return status; }
}
