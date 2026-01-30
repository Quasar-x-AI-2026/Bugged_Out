package com.example.buggedout.DataLayer.RepositoryImpl


import com.example.buggedout.DataLayer.datasource.FirebaseAuthDataSource
import com.example.buggedout.DomainLayer.Repository.AuthRepository
import com.example.buggedout.DomainLayer.Model.User
import com.example.buggedout.DomainLayer.util.Results
import com.google.firebase.auth.FirebaseAuth

class AuthRepositoryImpl(
    private val authDataSource: FirebaseAuthDataSource
) : AuthRepository {

    override suspend fun login(
        email: String,
        password: String
    ): Results<User> {
        return try {
            val firebaseUser = authDataSource.login(email, password)

            val user = User(
                uid = firebaseUser.uid,
                email = firebaseUser.email ?: "",
                role = ""
            )

            Results.Success(user)
        } catch (e: Exception) {
            Results.Failure(e.message ?: "Login failed")
        }
    }

    override fun isUserLoggedIn(): Boolean =
        authDataSource.isUserLoggedIn()

    override suspend fun signup(
        email: String,
        password: String,
        role: String
    ): Results<User> {
        return try {
            val firebaseUser = authDataSource.signup(email, password)

            val user = User(
                uid = firebaseUser.uid,
                email = firebaseUser.email ?: "",
                role = role
            )

            Results.Success(user)
        } catch (e: Exception) {
            Results.Failure(e.message ?: "Signup failed")
        }
    }


    override suspend fun getCurrentUser(): Results<User?> {
        return try {
            val isLoggedIn = authDataSource.isUserLoggedIn()
            if (!isLoggedIn) {
                Results.Success(null)
            } else {
                val firebaseUser = FirebaseAuth.getInstance().currentUser

                val user = firebaseUser?.let {
                    User(
                        uid = it.uid,
                        email = it.email ?: "",
                        role = ""
                    )
                }

                Results.Success(user)
            }
        } catch (e: Exception) {
            Results.Failure(e.message ?: "Failed to get current user")
        }
    }

}
