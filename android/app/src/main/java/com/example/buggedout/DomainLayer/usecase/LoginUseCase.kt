package com.example.buggedout.DomainLayer.usecase

import com.example.buggedout.DomainLayer.Repository.AuthRepository
import com.example.buggedout.DomainLayer.util.Results
import com.example.buggedout.DomainLayer.Model.User

class LoginUseCase(
    private val repository: AuthRepository
) {

    suspend operator fun invoke(
        email: String,
        password: String
    ): Results<User> {
        return repository.login(email, password)
    }
}