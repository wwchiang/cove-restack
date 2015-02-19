<?php
/**
 * Created by PhpStorm.
 * User: willi_000
 * Date: 2/16/2015
 * Time: 5:39 PM
 */
?>

<?php
    include "base.php";
?>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <title>User Management System (Tom Cameron for NetTuts)</title>
        <link rel="stylesheet" href="style.css" type="text/css" />
        <link rel="stylesheet" href="normalize.css">
</head>
<body>
    <div id="main">
        <?php
        if(!empty($_SESSION['LoggedIn']) && !empty($_SESSION['Username']))
        {
            ?>

            <h1>Member Area</h1>
            <p>Thanks for logging in! You are <code><?=$_SESSION['Username']?></code>
                and your email address is <code><?=$_SESSION['EmailAddress']?></code>.</p>


            <ul>
                <li><a href="logout.php">Logout.</a></li>
            </ul>
        <?php
        }
        elseif(!empty($_POST['username']) && !empty($_POST['password']))
        {
            $username = mysql_real_escape_string($_POST['username']);
            $password = md5(mysql_real_escape_string($_POST['password']));

            $checklogin = mysql_query("SELECT * FROM users WHERE Username = '".$username."' AND Password = '".$password."'");
#
            if(mysql_num_rows($checklogin) == 1)
            {
                $row = mysql_fetch_array($checklogin);
                $email = $row['EmailAddress'];

                $_SESSION['Username'] = $username;
                $_SESSION['EmailAddress'] = $email;
                $_SESSION['LoggedIn'] = 1;

                echo "<h1>Success</h1>";
                echo "<p>We are now redirecting you to the member area.</p>";
                //<meta http-equiv="refresh" content="0;URL=http://www.example.com" />
                //CHANGE THE LINK TO WHERE THE MAIN PAGE WILL BE
                echo "<meta http-equiv='refresh' content='2;URL=index.php' />";
                echo "<p>If you are not redirected in 5 seconds, click <a href=\"index.php\"here</a> to continue.</p>";
            }
            else
            {
                echo "<h1>Error</h1>";
                echo "<p>Sorry, your account could not be found. Please <a href=\"index.php\">click here to try again</a>.</p>";
            }
        }
        else
        {
            ?>
        <section class="loginform cf">
            <ul>
            <h1>Member Login</h1>

            <p>Login below, or <a href="register.php">click here to register</a>.</p>

            <form method="post" action="index.php" name="loginform" id="loginform">
                <fieldset>
                    <li>
                    <label for="username">Username:</label><input type="text" name="username" id="username" /><br />
                    </li>
                    <li>
                    <label for="password">Password:</label><input type="password" name="password" id="password" /><br />
                    </li>
                    <li>
                    <input type="submit" name="login" id="login" value="Login" />
                    </li>
                </fieldset>
            </form>

            </ul>
        </section>
        <?php
        }
        ?>

    </div>
</body>
</html>