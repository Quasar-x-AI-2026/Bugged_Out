package com.example.buggedout.DomainLayer.Repository

import com.example.buggedout.DomainLayer.Model.User
import com.example.buggedout.DomainLayer.util.Results

interface AuthRepository {
    suspend fun login(email: String,password: String) : Results<User>
    suspend fun signup(email: String,password: String, role: String) : Results<User>
    fun isUserLoggedIn() : Boolean
    suspend fun getCurrentUser(): Results<User?>

}