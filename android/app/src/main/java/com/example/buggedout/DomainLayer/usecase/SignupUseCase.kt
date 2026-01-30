package com.example.buggedout.DomainLayer.usecase

import com.example.buggedout.DomainLayer.Repository.AuthRepository
import com.example.buggedout.DomainLayer.Model.User
import com.example.buggedout.DomainLayer.util.Results

class SignupUseCase(
    private val repository: AuthRepository
) {

    suspend operator fun invoke(
        email: String,
        password: String,
        role: String
    ): Results<User> {
        return repository.signup(email, password, role)
    }
}