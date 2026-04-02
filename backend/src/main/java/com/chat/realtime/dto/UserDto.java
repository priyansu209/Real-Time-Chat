package com.chat.realtime.dto;

import com.chat.realtime.model.UserStatus;

public class UserDto {
    private String username;
    private UserStatus status;

    public UserDto() {}

    public UserDto(String username, UserStatus status) {
        this.username = username;
        this.status = status;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }
}
