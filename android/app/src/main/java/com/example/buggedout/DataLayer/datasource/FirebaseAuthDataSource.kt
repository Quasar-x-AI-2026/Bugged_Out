package com.example.buggedout.DataLayer.datasource

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import kotlinx.coroutines.tasks.await

class FirebaseAuthDataSource {

    private val firebaseAuth: FirebaseAuth =
        FirebaseAuth.getInstance()

    fun isUserLoggedIn(): Boolean {
        return firebaseAuth.currentUser != null
    }

    suspend fun login(
        email: String,
        password: String
    ): FirebaseUser {
        val result = firebaseAuth
            .signInWithEmailAndPassword(email, password)
            .await()

        return result.user!!
    }
    suspend fun signup(
        email: String,
        password: String
    ): FirebaseUser {
        val result = firebaseAuth
            .createUserWithEmailAndPassword(email, password)
            .await()

        return result.user!!
    }

}
