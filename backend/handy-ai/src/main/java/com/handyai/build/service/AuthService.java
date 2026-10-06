package com.handyai.build.service;

import com.handyai.build.domain.Role;
import com.handyai.build.domain.User;
import com.handyai.build.dto.AuthResponse;
import com.handyai.build.dto.LoginRequest;
import com.handyai.build.dto.RegisterRequest;
import com.handyai.build.dto.UserResponse;
import com.handyai.build.exception.ConflictException;
import com.handyai.build.exception.ResourceNotFoundException;
import com.handyai.build.exception.UnauthorizedException;
import com.handyai.build.repository.UserRepository;
import com.handyai.build.security.JwtService;
import com.handyai.build.security.PasswordHasher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordHasher passwordHasher;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordHasher passwordHasher,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normaliseEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("An account with this email already exists");
        }

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordHasher.hash(request.password()));
        user.setProfession(trimToNull(request.profession()));
        user.setRole(Role.USER);

        User saved = userRepository.save(user);
        return tokenFor(saved);
    }

    /**
     * Hashing runs outside any database write, and the lookup is read-only, so a burst of logins
     * costs CPU but never holds a row lock.
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normaliseEmail(request.email()))
                .orElseThrow(() -> new UnauthorizedException("Email or password is incorrect"));
        if (!passwordHasher.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Email or password is incorrect");
        }
        return tokenFor(user);
    }

    @Transactional(readOnly = true)
    public UserResponse profile(Long userId) {
        return UserResponse.from(loadUser(userId));
    }

    @Transactional
    public UserResponse updateProfile(Long userId, String name, String profession) {
        User user = loadUser(userId);
        if (name != null && !name.isBlank()) {
            user.setName(name.trim());
        }
        user.setProfession(trimToNull(profession));
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public User loadUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));
    }

    private AuthResponse tokenFor(User user) {
        String token = jwtService.issue(user.getId(), user.getEmail(), user.getRole().name());
        return new AuthResponse(token, jwtService.getTtl().toSeconds(), UserResponse.from(user));
    }

    private String normaliseEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
