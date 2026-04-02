package com.chat.realtime.dto;

public class AuthResponse {
    private String token;
    private String id;
    private String username;

    public AuthResponse(String token, String id, String username) {
        this.token = token;
        this.id = id;
        this.username = username;
    }

    public String getToken() {
        return token;
    }

    public String getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }
}
