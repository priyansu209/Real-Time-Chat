package com.chat.realtime.controller;

import com.chat.realtime.dto.UserDto;
import com.chat.realtime.model.User;
import com.chat.realtime.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<UserDto>> getAllUsers(Principal principal) {
        String loggedInUser = principal != null ? principal.getName() : "";
        
        List<UserDto> users = userRepository.findAll()
                .stream()
                .filter(user -> !user.getUsername().equals(loggedInUser))
                .map(user -> new UserDto(user.getUsername(), user.getStatus()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(users);
    }
}
