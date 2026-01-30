package com.example.buggedout.DomainLayer.usecase

import com.example.buggedout.DomainLayer.Repository.AuthRepository
import com.example.buggedout.DomainLayer.Model.User
import com.example.buggedout.DomainLayer.util.Results

class GetCurrentUserUseCase(
    private val repository: AuthRepository
) {

    suspend operator fun invoke(): Results<User?> {
        return repository.getCurrentUser()
    }
}